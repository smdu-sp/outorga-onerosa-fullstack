/** @format */

import Link from 'next/link';
import { PageHeader, PageShell } from '@/components/page-shell';
import { requireDev } from '@/lib/auth/session';
import { mascararNumeroProcesso } from '@/lib/mascara-processo';
import type { SituacaoPagamento } from '@/lib/antecipacao';
import {
	SITUACOES,
	auditoriaParcelas,
	type AlertaAuditoria,
	type LinhaAuditoria,
} from '@/lib/server/auditoria-parcelas';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SIT: Record<SituacaoPagamento, { label: string; cor: string; descricao: string }> = {
	ANTECIPADA: {
		label: 'Antecipada',
		cor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
		descricao: 'Paga em mês anterior ao do vencimento e com mais dias que a tolerância.',
	},
	EM_DIA: {
		label: 'Paga em dia',
		cor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
		descricao: 'Paga no dia, no mesmo mês do vencimento ou na virada de mês (dentro da tolerância).',
	},
	EM_ATRASO: {
		label: 'Paga em atraso',
		cor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
		descricao: 'Pagamento posterior ao vencimento.',
	},
	PAGA_SEM_DATA: {
		label: 'Paga sem data',
		cor: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
		descricao: 'Quitada, mas sem data de pagamento: não dá para classificar antecipação/atraso.',
	},
	VENCIDA_NAO_PAGA: {
		label: 'Vencida não paga',
		cor: 'bg-red-500/15 text-red-700 dark:text-red-300',
		descricao: 'Vencimento passado, sem pagamento e sem quebra.',
	},
	A_VENCER: {
		label: 'A vencer',
		cor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
		descricao: 'Vencimento hoje ou futuro, sem pagamento.',
	},
	QUEBRA: {
		label: 'Quebra',
		cor: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
		descricao: 'Parcela quebrada e não paga.',
	},
};

const ALERTA: Record<AlertaAuditoria, string> = {
	FLAG_DIVERGE_DA_REGRA: 'Flag "antecipada" gravado diverge da regra',
	PAGO_MUITO_ANTES: 'Pago mais de 365 dias antes',
	PAGO_MUITO_DEPOIS: 'Pago mais de 90 dias depois',
	QUEBRA_E_PAGA: 'Marcada quebra e paga',
	PAGAMENTO_FUTURO: 'Data de pagamento no futuro',
	PAGAMENTO_ANTES_DO_PROCESSO: 'Pago em ano anterior ao do nº do processo',
};

const MOTIVO_EM_DIA = { NO_DIA: 'no dia', MESMO_MES: 'mesmo mês', VIRADA_DE_MES: 'virada de mês' } as const;

const fmtBrl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtData = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');
const fmtInt = (n: number) => n.toLocaleString('pt-BR');
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function um(v: string | string[] | undefined) {
	return Array.isArray(v) ? v[0] : v;
}

export default async function DevAuditoriaParcelasPage({ searchParams }: { searchParams: SearchParams }) {
	await requireDev();
	const params = await searchParams;
	const situacaoParam = um(params.situacao);
	const situacao = SITUACOES.find((s) => s === situacaoParam);
	const anoNum = Number(um(params.ano));
	const ano = Number.isInteger(anoNum) && anoNum > 1990 ? anoNum : undefined;
	const mesNum = Number(um(params.mes));
	const mes = Number.isInteger(mesNum) && mesNum >= 1 && mesNum <= 12 ? mesNum : undefined;
	const ordem = um(params.ordem) === 'asc' ? 'asc' : 'desc';
	const obrigacao = ['PDE', 'COTA', 'AIU'].find((o) => o === um(params.obrigacao));
	const busca = um(params.q)?.trim() || undefined;
	const somenteAlertas = um(params.alertas) === '1';
	const pagina = Math.max(1, Number(um(params.pagina)) || 1);

	const dados = await auditoriaParcelas({ situacao, ano, mes, obrigacao, busca, somenteAlertas, ordem }, pagina);

	const qs = (extra: Record<string, string | undefined>) => {
		const base: Record<string, string | undefined> = {
			situacao,
			ano: ano?.toString(),
			mes: mes?.toString(),
			obrigacao,
			q: busca,
			alertas: somenteAlertas ? '1' : undefined,
			ordem: ordem === 'asc' ? 'asc' : undefined,
		};
		const sp = new URLSearchParams();
		for (const [k, v] of Object.entries({ ...base, ...extra })) if (v) sp.set(k, v);
		const s = sp.toString();
		return s ? `?${s}` : '?';
	};
	const totalPaginas = Math.max(1, Math.ceil(dados.totalFiltrado / dados.porPagina));
	const semData = dados.resumo.find((r) => r.situacao === 'PAGA_SEM_DATA')?.parcelas ?? 0;
	const pagasTotal = dados.resumo
		.filter((r) => ['ANTECIPADA', 'EM_DIA', 'EM_ATRASO', 'PAGA_SEM_DATA'].includes(r.situacao))
		.reduce((s, r) => s + r.parcelas, 0);
	const totalAlertas = Object.values(dados.alertasPorTipo).reduce((s, n) => s + (n ?? 0), 0);

	return (
		<PageShell max="wide">
			<PageHeader
				title="Auditoria de pagamento de parcelas"
				badge={
					<span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
						DEV
					</span>
				}
			/>

			<p className="mt-4 text-sm text-muted-foreground">
				{fmtInt(dados.totalParcelas)} parcelas · referência {fmtData(dados.hoje)} · antecipada = pago em{' '}
				<b>mês anterior</b> ao do vencimento <b>e</b> mais de {dados.toleranciaDias} dias antes (tolerância de virada
				de mês).
			</p>

			{/* resumo por situação */}
			<div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
				{dados.resumo.map((r) => {
					const ativo = situacao === r.situacao;
					return (
						<Link
							key={r.situacao}
							href={qs({ situacao: ativo ? undefined : r.situacao, pagina: undefined })}
							title={SIT[r.situacao].descricao}
							className={`rounded-xl border p-3 transition-colors hover:bg-muted ${ativo ? 'border-foreground bg-muted' : 'border-border bg-card'}`}>
							<span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${SIT[r.situacao].cor}`}>
								{SIT[r.situacao].label}
							</span>
							<div className="mt-2 text-xl font-semibold tabular-nums">{fmtInt(r.parcelas)}</div>
							<div className="text-xs text-muted-foreground tabular-nums">{fmtBrl(r.valor)}</div>
						</Link>
					);
				})}
			</div>

			{/* filtros */}
			<form
				method="get"
				className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 text-sm">
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Situação</span>
					<select
						name="situacao"
						defaultValue={situacao ?? ''}
						className="h-9 rounded-md border border-input bg-background px-2">
						<option value="">Todas</option>
						{SITUACOES.map((s) => (
							<option key={s} value={s}>
								{SIT[s].label}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Ano do vencimento</span>
					<input
						name="ano"
						defaultValue={ano ?? ''}
						placeholder="todos"
						inputMode="numeric"
						className="h-9 w-28 rounded-md border border-input bg-background px-2"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Mês do vencimento</span>
					<select name="mes" defaultValue={mes ?? ''} className="h-9 rounded-md border border-input bg-background px-2">
						<option value="">Todos</option>
						{MESES.map((m, i) => (
							<option key={m} value={i + 1}>
								{m}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Ordenar vencimento</span>
					<select name="ordem" defaultValue={ordem} className="h-9 rounded-md border border-input bg-background px-2">
						<option value="desc">Mais recente primeiro</option>
						<option value="asc">Mais antigo primeiro</option>
					</select>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Obrigação</span>
					<select
						name="obrigacao"
						defaultValue={obrigacao ?? ''}
						className="h-9 rounded-md border border-input bg-background px-2">
						<option value="">Todas</option>
						<option>PDE</option>
						<option>COTA</option>
						<option>AIU</option>
					</select>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Processo</span>
					<input
						name="q"
						defaultValue={busca ?? ''}
						placeholder="nº do processo"
						className="h-9 w-48 rounded-md border border-input bg-background px-2"
					/>
				</label>
				<label className="flex h-9 items-center gap-2">
					<input type="checkbox" name="alertas" value="1" defaultChecked={somenteAlertas} />
					<span>Só com alerta</span>
				</label>
				<button type="submit" className="h-9 rounded-md bg-foreground px-4 text-background">
					Filtrar
				</button>
				<Link href="?" className="h-9 content-center text-muted-foreground underline">
					Limpar
				</Link>
			</form>

			{/* revisão da regra */}
			<details className="mt-4 rounded-xl border border-border bg-card p-3 text-sm">
				<summary className="cursor-pointer font-medium">Revisão da regra de antecipação</summary>
				<div className="mt-3 grid gap-4 md:grid-cols-2">
					<div>
						<p className="mb-2 text-muted-foreground">
							Antecipadas entre as {fmtInt(dados.pagasComData)} pagas <b>com data</b>, por tolerância (vigente:{' '}
							{dados.toleranciaDias}):
						</p>
						<table className="w-full tabular-nums">
							<tbody>
								{dados.sensibilidade.map((s) => (
									<tr key={s.tolerancia} className={s.tolerancia === dados.toleranciaDias ? 'font-semibold' : ''}>
										<td className="py-0.5">{s.tolerancia} dias</td>
										<td className="py-0.5 text-right">{fmtInt(s.antecipadas)}</td>
										<td className="py-0.5 text-right text-muted-foreground">
											{((s.antecipadas / Math.max(1, dados.pagasComData)) * 100).toFixed(1)}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div>
						<p className="mb-2 text-muted-foreground">
							{fmtInt(totalAlertas)} alertas. {fmtInt(semData)} de {fmtInt(pagasTotal)} parcelas pagas (
							{((semData / Math.max(1, pagasTotal)) * 100).toFixed(0)}%) estão sem data e não entram na
							classificação.
						</p>
						<ul className="space-y-0.5">
							{(Object.keys(ALERTA) as AlertaAuditoria[]).map((a) => (
								<li key={a} className="flex justify-between tabular-nums">
									<span>{ALERTA[a]}</span>
									<span>{fmtInt(dados.alertasPorTipo[a] ?? 0)}</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			</details>

			{/* tabela */}
			<div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/60 text-left text-xs text-muted-foreground">
						<tr>
							<th className="px-3 py-2">Processo</th>
							<th className="px-3 py-2">Obrig.</th>
							<th className="px-3 py-2 text-right">Parc.</th>
							<th className="px-3 py-2">
								<Link
									href={qs({ ordem: ordem === 'asc' ? undefined : 'asc', pagina: undefined })}
									title="Alternar ordenação por vencimento"
									className="hover:text-foreground hover:underline">
									Vencimento {ordem === 'asc' ? '↑' : '↓'}
								</Link>
							</th>
							<th className="px-3 py-2">Pagamento</th>
							<th className="px-3 py-2 text-right" title="vencimento − pagamento (positivo = pago antes)">
								Dias
							</th>
							<th className="px-3 py-2">Situação</th>
							<th className="px-3 py-2">Flag gravado</th>
							<th className="px-3 py-2 text-right">Valor</th>
							<th className="px-3 py-2">Alertas</th>
						</tr>
					</thead>
					<tbody>
						{dados.linhas.map((l) => (
							<LinhaTabela key={l.id} l={l} />
						))}
						{dados.linhas.length === 0 && (
							<tr>
								<td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
									Nenhuma parcela com esses filtros.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className="mt-3 flex items-center justify-between text-sm">
				<span className="text-muted-foreground">
					{fmtInt(dados.totalFiltrado)} parcelas · soma{' '}
					<b className="text-foreground tabular-nums">{fmtBrl(dados.valorFiltrado)}</b> · página {dados.pagina} de {totalPaginas}
				</span>
				<div className="flex gap-2">
					{dados.pagina > 1 && (
						<Link
							className="rounded-md border border-border px-3 py-1 hover:bg-muted"
							href={qs({ pagina: String(dados.pagina - 1) })}>
							← Anterior
						</Link>
					)}
					{dados.pagina < totalPaginas && (
						<Link
							className="rounded-md border border-border px-3 py-1 hover:bg-muted"
							href={qs({ pagina: String(dados.pagina + 1) })}>
							Próxima →
						</Link>
					)}
				</div>
			</div>
		</PageShell>
	);
}

function LinhaTabela({ l }: { l: LinhaAuditoria }) {
	const s = SIT[l.situacao];
	return (
		<tr className="border-t border-border/60 hover:bg-muted/40">
			<td className="px-3 py-1.5 font-mono text-xs">
				<Link href={`/processos/${l.processoId}`} className="underline-offset-2 hover:underline">
					{mascararNumeroProcesso(l.numProcesso)}
				</Link>
			</td>
			<td className="px-3 py-1.5">{l.obrigacao ?? '—'}</td>
			<td className="px-3 py-1.5 text-right tabular-nums">{l.numParcela}</td>
			<td className="px-3 py-1.5 tabular-nums">{fmtData(l.vencimento)}</td>
			<td className="px-3 py-1.5 tabular-nums">{fmtData(l.dataQuitacao)}</td>
			<td className="px-3 py-1.5 text-right tabular-nums">{l.dias ?? '—'}</td>
			<td className="px-3 py-1.5">
				<span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${s.cor}`}>{s.label}</span>
				{l.motivoEmDia && (
					<span className="ml-1.5 text-xs text-muted-foreground">{MOTIVO_EM_DIA[l.motivoEmDia]}</span>
				)}
			</td>
			<td className="px-3 py-1.5 text-xs">{l.flagAntecipada ? 'antecipada' : '—'}</td>
			<td className="px-3 py-1.5 text-right tabular-nums">{fmtBrl(l.valor)}</td>
			<td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">
				{l.alertas.map((a) => ALERTA[a]).join('; ')}
			</td>
		</tr>
	);
}
