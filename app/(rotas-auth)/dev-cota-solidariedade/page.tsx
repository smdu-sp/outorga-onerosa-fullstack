/** @format */

import Link from 'next/link';
import { PageHeader, PageShell } from '@/components/page-shell';
import { requireDev } from '@/lib/auth/session';
import { mascararNumeroProcesso } from '@/lib/mascara-processo';
import type { SituacaoPagamento } from '@/lib/antecipacao';
import {
	COMPARACOES,
	ORDENS,
	PADROES,
	processosCota,
	type ComparacaoFicha,
	type OrdemCota,
	type PadraoParcelas,
	type ProcessoCota,
} from '@/lib/server/cota-parcelas';

const ORDEM: Record<OrdemCota, string> = {
	data_desc: 'Data mais recente primeiro',
	data_asc: 'Data mais antiga primeiro',
	soma_desc: 'Maior soma primeiro',
	razao_asc: 'Menor soma/calculado primeiro',
};

/** Colunas do cabeçalho e das linhas do acordeão (precisam bater). */
const GRID = 'grid-cols-[1.5fr_0.8fr_0.4fr_1fr_1fr_1fr_0.6fr_1.3fr]';

const dataValida = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PADRAO: Record<PadraoParcelas, { label: string; descricao: string }> = {
	SEM_PARCELAS: { label: 'Sem parcelas', descricao: 'Tem ficha da Cota, mas nenhuma parcela COTA importada.' },
	UNICA: { label: 'Parcela única', descricao: 'Uma só parcela: pagamento integral ou só a entrada?' },
	IGUAIS: {
		label: 'Só saldo (parcelas iguais)',
		descricao: 'Todas as parcelas com o mesmo valor: provavelmente só o saldo, sem a entrada de 50%.',
	},
	ENTRADA_50: {
		label: 'Entrada 50% + saldo',
		descricao: 'Uma das parcelas vale 50% da soma: a entrada está registrada (às vezes com nº de parcela fora de ordem).',
	},
	OUTRO: { label: 'Outro', descricao: 'Valores sem padrão reconhecido.' },
};

const COMP: Record<ComparacaoFicha, { label: string; cor: string; descricao: string }> = {
	BATE_50: {
		label: 'Soma ≈ 50% do calculado',
		cor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
		descricao: 'Soma das parcelas é metade do valor calculado: entrada de 50% ausente?',
	},
	BATE_100: {
		label: 'Soma ≈ 100% do calculado',
		cor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
		descricao: 'Soma das parcelas bate com o valor calculado da ficha.',
	},
	DIVERGE: {
		label: 'Diverge',
		cor: 'bg-red-500/15 text-red-700 dark:text-red-300',
		descricao: 'Soma não bate nem com 100% nem com 50% do valor calculado.',
	},
	SEM_FICHA: {
		label: 'Sem valor calculado',
		cor: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
		descricao: 'Sem ficha da Cota ou ficha sem valor calculado: não dá para comparar.',
	},
};

const SIT: Record<SituacaoPagamento, { label: string; cor: string }> = {
	ANTECIPADA: { label: 'Antecipada', cor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
	EM_DIA: { label: 'Paga em dia', cor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
	EM_ATRASO: { label: 'Paga em atraso', cor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
	PAGA_SEM_DATA: { label: 'Paga sem data', cor: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300' },
	VENCIDA_NAO_PAGA: { label: 'Vencida não paga', cor: 'bg-red-500/15 text-red-700 dark:text-red-300' },
	A_VENCER: { label: 'A vencer', cor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
	QUEBRA: { label: 'Quebra', cor: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300' },
};

const fmtBrl = (v: number | null) =>
	v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');
const fmtInt = (n: number) => n.toLocaleString('pt-BR');
const fmtPct = (r: number | null) => (r == null ? '—' : `${(r * 100).toFixed(1)}%`);

function um(v: string | string[] | undefined) {
	return Array.isArray(v) ? v[0] : v;
}

export default async function DevCotaSolidariedadePage({ searchParams }: { searchParams: SearchParams }) {
	await requireDev();
	const params = await searchParams;
	const padrao = PADROES.find((p) => p === um(params.padrao));
	const comparacao = COMPARACOES.find((c) => c === um(params.comparacao));
	const busca = um(params.q)?.trim() || undefined;
	const de = dataValida(um(params.de));
	const ate = dataValida(um(params.ate));
	const ordem = ORDENS.find((o) => o === um(params.ordem)) ?? 'data_desc';

	const dados = await processosCota({ padrao, comparacao, busca, de, ate, ordem });

	const qs = (extra: Record<string, string | undefined>) => {
		const sp = new URLSearchParams();
		const base = { padrao, comparacao, q: busca, de, ate, ordem: ordem === 'data_desc' ? undefined : ordem };
		for (const [k, v] of Object.entries({ ...base, ...extra })) if (v) sp.set(k, v);
		const s = sp.toString();
		return s ? `?${s}` : '?';
	};
	const somaFiltrada = dados.processos.reduce((s, p) => s + p.soma, 0);

	return (
		<PageShell max="wide">
			<PageHeader
				title="Cota de Solidariedade — parcelas"
				badge={
					<span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
						DEV
					</span>
				}
			/>

			<p className="mt-4 text-sm text-muted-foreground">
				{fmtInt(dados.total)} processos com Cota (parcela COTA ou ficha de monitoramento) · referência{' '}
				{fmtData(dados.hoje)}. Hipótese: a planilha não registra a <b>entrada de 50%</b>, só o saldo parcelado.
			</p>

			{/* comparação com a ficha */}
			<div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
				{COMPARACOES.map((c) => {
					const ativo = comparacao === c;
					return (
						<Link
							key={c}
							href={qs({ comparacao: ativo ? undefined : c })}
							title={COMP[c].descricao}
							className={`rounded-xl border p-3 transition-colors hover:bg-muted ${ativo ? 'border-foreground bg-muted' : 'border-border bg-card'}`}>
							<span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${COMP[c].cor}`}>{COMP[c].label}</span>
							<div className="mt-2 text-xl font-semibold tabular-nums">{fmtInt(dados.porComparacao[c])}</div>
						</Link>
					);
				})}
			</div>

			{/* padrão das parcelas */}
			<div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
				{PADROES.map((p) => {
					const ativo = padrao === p;
					return (
						<Link
							key={p}
							href={qs({ padrao: ativo ? undefined : p })}
							title={PADRAO[p].descricao}
							className={`rounded-xl border p-3 transition-colors hover:bg-muted ${ativo ? 'border-foreground bg-muted' : 'border-border bg-card'}`}>
							<span className="text-xs font-medium text-muted-foreground">{PADRAO[p].label}</span>
							<div className="mt-1 text-xl font-semibold tabular-nums">{fmtInt(dados.porPadrao[p])}</div>
						</Link>
					);
				})}
			</div>

			<form
				method="get"
				className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 text-sm">
				{padrao && <input type="hidden" name="padrao" value={padrao} />}
				{comparacao && <input type="hidden" name="comparacao" value={comparacao} />}
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Processo</span>
					<input
						name="q"
						defaultValue={busca ?? ''}
						placeholder="nº do processo"
						className="h-9 w-56 rounded-md border border-input bg-background px-2"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">1º vencimento de</span>
					<input
						type="date"
						name="de"
						defaultValue={de ?? ''}
						className="h-9 rounded-md border border-input bg-background px-2"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">até</span>
					<input
						type="date"
						name="ate"
						defaultValue={ate ?? ''}
						className="h-9 rounded-md border border-input bg-background px-2"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Ordenar</span>
					<select name="ordem" defaultValue={ordem} className="h-9 rounded-md border border-input bg-background px-2">
						{ORDENS.map((o) => (
							<option key={o} value={o}>
								{ORDEM[o]}
							</option>
						))}
					</select>
				</label>
				<button type="submit" className="h-9 rounded-md bg-foreground px-4 text-background">
					Filtrar
				</button>
				<Link href="?" className="h-9 content-center text-muted-foreground underline">
					Limpar
				</Link>
				<span className="ml-auto h-9 content-center text-muted-foreground">
					{fmtInt(dados.processos.length)} processos · soma das parcelas{' '}
					<b className="text-foreground tabular-nums">{fmtBrl(somaFiltrada)}</b>
				</span>
			</form>

			<div className="mt-4 overflow-hidden rounded-xl border border-border bg-card text-sm">
				<div className={`grid ${GRID} gap-3 bg-muted/60 px-3 py-2 text-xs text-muted-foreground`}>
					<span>Processo</span>
					<Link
						href={qs({ ordem: ordem === 'data_desc' ? 'data_asc' : undefined })}
						title="1º vencimento COTA (sem parcelas: data de entrada). Clique para alternar a ordem."
						className="hover:text-foreground hover:underline">
						1º venc. {ordem === 'data_desc' ? '↓' : ordem === 'data_asc' ? '↑' : ''}
					</Link>
					<span className="text-right">Parc.</span>
					<Link
						href={qs({ ordem: 'soma_desc' })}
						className="text-right hover:text-foreground hover:underline">
						Soma parcelas {ordem === 'soma_desc' ? '↓' : ''}
					</Link>
					<span className="text-right">Pago</span>
					<span className="text-right">Calculado (ficha)</span>
					<Link
						href={qs({ ordem: 'razao_asc' })}
						className="text-right hover:text-foreground hover:underline">
						Soma/calc. {ordem === 'razao_asc' ? '↑' : ''}
					</Link>
					<span>Comparação</span>
				</div>
				{dados.processos.map((p) => (
					<LinhaProcesso key={p.processoId} p={p} />
				))}
				{dados.processos.length === 0 && (
					<div className="px-3 py-10 text-center text-muted-foreground">Nenhum processo com esses filtros.</div>
				)}
			</div>
		</PageShell>
	);
}

function LinhaProcesso({ p }: { p: ProcessoCota }) {
	const c = COMP[p.comparacao];
	return (
		<details className="group border-t border-border/60">
			<summary
				className={`grid ${GRID} cursor-pointer list-none items-center gap-3 px-3 py-2 hover:bg-muted/40 [&::-webkit-details-marker]:hidden`}>
				<span className="font-mono text-xs">
					<span className="mr-1.5 inline-block text-muted-foreground transition-transform group-open:rotate-90">▸</span>
					{mascararNumeroProcesso(p.numProcesso)}
				</span>
				<span
					className={`tabular-nums ${p.parcelas.length ? '' : 'text-muted-foreground'}`}
					title={p.parcelas.length ? `último vencimento ${fmtData(p.ultimoVencimento)}` : 'data de entrada do processo'}>
					{fmtData(p.dataReferencia)}
				</span>
				<span className="text-right tabular-nums">{p.parcelas.length}</span>
				<span className="text-right tabular-nums">{fmtBrl(p.soma)}</span>
				<span className="text-right tabular-nums">{fmtBrl(p.pago)}</span>
				<span className="text-right tabular-nums">{fmtBrl(p.valorCalculado)}</span>
				<span className="text-right tabular-nums">{fmtPct(p.razao)}</span>
				<span>
					<span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${c.cor}`}>{c.label}</span>
					<span className="ml-1.5 text-xs text-muted-foreground">{PADRAO[p.padrao].label}</span>
				</span>
			</summary>

			<div className="border-t border-border/60 bg-muted/20 px-3 py-3">
				<dl className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs md:grid-cols-4">
					<Info k="Tipo do processo" v={p.tipo ?? '—'} />
					<Info k="Modalidade" v={p.modalidade ?? '—'} />
					<Info k="Situação (ficha)" v={p.situacaoCota ?? '—'} />
					<Info k="Parcelas de outras obrigações" v={String(p.outrasObrigacoes)} />
					<Info k="Estimativa DMUS (FUNDURB)" v={fmtBrl(p.estimativaFundurb)} />
					<Info k="Valor pago (ficha)" v={fmtBrl(p.valorPagoFicha)} />
					<Info k="Valor devido (ficha)" v={fmtBrl(p.valorDevidoFicha)} />
					<Info
						k="Faltante p/ calculado"
						v={p.valorCalculado == null ? '—' : fmtBrl(p.valorCalculado - p.soma)}
					/>
				</dl>

				{p.parcelas.length > 0 ? (
					<table className="w-full text-xs">
						<thead className="text-left text-muted-foreground">
							<tr>
								<th className="py-1 pr-3 text-right">Parc.</th>
								<th className="py-1 pr-3">Vencimento</th>
								<th className="py-1 pr-3">Pagamento</th>
								<th className="py-1 pr-3">Situação</th>
								<th className="py-1 pr-3">CPF/CNPJ</th>
								<th className="py-1 pr-3 text-right">Valor</th>
								<th className="py-1 text-right">% da soma</th>
								<th className="py-1 text-right">% do calculado</th>
							</tr>
						</thead>
						<tbody>
							{p.parcelas.map((x) => (
								<tr key={x.id} className="border-t border-border/40">
									<td className="py-1 pr-3 text-right tabular-nums">{x.numParcela}</td>
									<td className="py-1 pr-3 tabular-nums">{fmtData(x.vencimento)}</td>
									<td className="py-1 pr-3 tabular-nums">{fmtData(x.dataQuitacao)}</td>
									<td className="py-1 pr-3">
										<span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${SIT[x.situacao].cor}`}>
											{SIT[x.situacao].label}
										</span>
									</td>
									<td className="py-1 pr-3 font-mono">{x.cpfCnpj ?? '—'}</td>
									<td className="py-1 pr-3 text-right tabular-nums">{fmtBrl(x.valor)}</td>
									<td className="py-1 text-right tabular-nums">{fmtPct(p.soma ? x.valor / p.soma : null)}</td>
									<td className="py-1 text-right tabular-nums">
										{fmtPct(p.valorCalculado ? x.valor / p.valorCalculado : null)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<p className="text-xs text-muted-foreground">Nenhuma parcela COTA importada.</p>
				)}

				<Link
					href={`/processos/${p.processoId}`}
					className="mt-3 inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
					Abrir processo →
				</Link>
			</div>
		</details>
	);
}

function Info({ k, v }: { k: string; v: string }) {
	return (
		<div className="flex justify-between gap-2">
			<dt className="text-muted-foreground">{k}</dt>
			<dd className="tabular-nums">{v}</dd>
		</div>
	);
}
