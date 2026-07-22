/** @format */

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, LandPlot } from 'lucide-react';
import { TableSkeleton } from '@/components/data-table';
import { relatorioZonas } from '@/services/relatorios/zonas';
import type { IRelatorioZonas } from '@/types/relatorio';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const MESES = [
	'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
	'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function descreverPeriodo(ano: number | null, mes: number | null): string {
	if (ano == null && mes == null) return 'Todo o período';
	if (ano != null && mes != null) return `${MESES[mes]} de ${ano}`;
	if (ano != null) return `Ano de ${ano}`;
	return `${MESES[mes!]} (todos os anos)`;
}

/** Nomes das zonas (Lei 16.402/2016) para tooltip. */
const ZONA_NOME: Record<string, string> = {
	ZEU: 'Zona de Eixo de Estruturação da Transformação Urbana',
	ZEUP: 'Zona de Eixo de Estruturação da Transformação Urbana Previsto',
	ZEUa: 'Zona de Eixo de Estruturação da Transformação Urbana Ambiental',
	ZEUPa: 'Zona de Eixo de Estruturação da Transformação Urbana Previsto Ambiental',
	ZM: 'Zona Mista',
	ZMa: 'Zona Mista Ambiental',
	ZC: 'Zona de Centralidade',
	ZEM: 'Zona de Estruturação Metropolitana',
	ZEMP: 'Zona de Estruturação Metropolitana Prevista',
	'ZEIS-1': 'Zona Especial de Interesse Social 1',
	'ZEIS-3': 'Zona Especial de Interesse Social 3',
	'ZEIS-5': 'Zona Especial de Interesse Social 5',
	'ZDE-1': 'Zona de Desenvolvimento Econômico 1',
	'ZDE-2': 'Zona de Desenvolvimento Econômico 2',
	'ZER-1': 'Zona Exclusivamente Residencial 1',
	'ZPI-1': 'Zona Predominantemente Industrial 1',
	'ZCOR-2': 'Zona Corredor 2',
	ZOE: 'Zona de Ocupação Especial',
	'PRAÇA/CANTEIRO': 'Praça / canteiro (área pública)',
};

export default async function ZonasUsoPage({ searchParams }: { searchParams: SearchParams }) {
	const params = await searchParams;
	const anoRaw = typeof params.ano === 'string' ? params.ano : undefined;
	const mesRaw = typeof params.mes === 'string' ? params.mes : undefined;

	const ano = anoRaw === 'todos' ? undefined : anoRaw ? Number(anoRaw) : new Date().getFullYear();
	const mes =
		mesRaw === 'todos' || mesRaw == null
			? undefined
			: Number.isNaN(Number(mesRaw)) || Number(mesRaw) < 0 || Number(mesRaw) > 11
				? undefined
				: Number(mesRaw);

	return (
		<Suspense key={`${ano ?? 't'}-${mes ?? 't'}`} fallback={<TableSkeleton />}>
			<Conteudo ano={ano} mes={mes} />
		</Suspense>
	);
}

async function Conteudo({ ano, mes }: { ano?: number; mes?: number }) {
	const resp = await relatorioZonas(ano, mes);
	if (!resp.ok || !resp.data) notFound();
	const d = resp.data;

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
				<Link href="/relatorios" className="flex items-center gap-1 hover:text-foreground transition-colors">
					<ArrowLeft className="h-3.5 w-3.5" />
					Relatórios
				</Link>
				<span>/</span>
				<span className="font-semibold text-foreground">Por zona de uso</span>
			</div>

			<div className="mb-5">
				<h1 className="flex items-center gap-2 text-[28px] font-bold tracking-tight">
					<LandPlot className="h-6 w-6 text-primary" />
					Arrecadação por zona de uso
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Outorga × Cota por zona de uso (Lei 16.402/2016). Valor arrecadado; AIU não incluída.
				</p>
			</div>

			<Filtros anos={d.anos} anoAtual={d.ano} mesAtual={d.mes} />

			<Tabela d={d} />
		</div>
	);
}

function Filtros({
	anos,
	anoAtual,
	mesAtual,
}: {
	anos: number[];
	anoAtual: number | null;
	mesAtual: number | null;
}) {
	// Preserva o outro parâmetro ao trocar ano ou mês
	const hrefAno = (a: number | 'todos') =>
		`?ano=${a}${mesAtual != null ? `&mes=${mesAtual}` : ''}`;
	const hrefMes = (m: number | 'todos') =>
		`?ano=${anoAtual ?? 'todos'}&mes=${m}`;

	const chip = (label: string, ativo: boolean, href: string) => (
		<Link
			key={label + href}
			href={href}
			className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
				ativo
					? 'border-foreground bg-foreground text-background'
					: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
			}`}>
			{label}
		</Link>
	);

	return (
		<div className="mb-6 flex flex-col gap-2.5">
			<div className="flex flex-wrap items-center gap-2">
				<span className="w-10 text-xs text-muted-foreground">Ano:</span>
				{chip('Todos', anoAtual == null, hrefAno('todos'))}
				{anos.map((a) => chip(String(a), anoAtual === a, hrefAno(a)))}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<span className="w-10 text-xs text-muted-foreground">Mês:</span>
				{chip('Todos', mesAtual == null, hrefMes('todos'))}
				{MESES_CURTO.map((m, i) => chip(m, mesAtual === i, hrefMes(i)))}
			</div>
		</div>
	);
}

function Tabela({ d }: { d: IRelatorioZonas }) {
	const totalOutorga = d.linhas.reduce((s, l) => s + l.outorgaValor, 0);
	const totalCota = d.linhas.reduce((s, l) => s + l.cotaValor, 0);
	const totalProc = d.linhas.reduce((s, l) => s + l.totalProc, 0);
	const somaZonas = totalOutorga + totalCota;
	const maxTotal = d.linhas[0]?.totalValor ?? 1;
	// Dupla contagem: empreendimentos com mais de uma zona entram em cada uma
	const haDuplaContagem = somaZonas > d.totalGeral + 1;

	return (
		<div className="rounded-xl border border-border bg-card shadow-xs">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
				<div className="text-sm font-semibold">
					Outorga × Cota por zona
					<span className="ml-2 text-xs font-normal text-muted-foreground">
						· {descreverPeriodo(d.ano, d.mes)}
					</span>
				</div>
				<div className="text-xs text-muted-foreground">
					{d.linhas.length} zonas · arrecadação real{' '}
					<span className="font-semibold text-foreground">{fmtBrl(d.totalGeral)}</span>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border text-xs text-muted-foreground">
							<th className="px-5 py-3 text-left font-medium">Zona</th>
							<th className="px-4 py-3 text-right font-medium">Outorga</th>
							<th className="px-3 py-3 text-right font-medium">Proc.</th>
							<th className="px-4 py-3 text-right font-medium">Cota</th>
							<th className="px-3 py-3 text-right font-medium">Proc.</th>
							<th className="px-4 py-3 text-right font-medium">Total</th>
							<th className="px-4 py-3 text-left font-medium">% do total</th>
						</tr>
					</thead>
					<tbody>
						{d.linhas.length === 0 && (
							<tr>
								<td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
									Sem arrecadação no período.
								</td>
							</tr>
						)}
						{d.linhas.map((l) => {
							const pctTotal = somaZonas > 0 ? (l.totalValor / somaZonas) * 100 : 0;
							return (
								<tr key={l.zona} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
									<td className="px-5 py-3 font-medium" title={ZONA_NOME[l.zona] ?? l.zona}>
										{l.zona}
									</td>
									<td className="px-4 py-3 text-right tabular-nums" style={{ color: '#1e3a7a' }}>
										{l.outorgaValor > 0 ? fmtBrl(l.outorgaValor) : '—'}
									</td>
									<td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
										{l.outorgaProc || '—'}
									</td>
									<td className="px-4 py-3 text-right tabular-nums" style={{ color: '#c2410c' }}>
										{l.cotaValor > 0 ? fmtBrl(l.cotaValor) : '—'}
									</td>
									<td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
										{l.cotaProc || '—'}
									</td>
									<td className="px-4 py-3 text-right font-semibold tabular-nums">
										{fmtBrl(l.totalValor)}
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center gap-2">
											<div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-primary"
													style={{ width: `${(l.totalValor / maxTotal) * 100}%` }}
												/>
											</div>
											<span className="w-10 text-right text-[11px] text-muted-foreground tabular-nums">
												{fmtPct(pctTotal)}
											</span>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
					{d.linhas.length > 0 && (
						<tfoot>
							<tr className="border-t-2 border-border bg-muted/30 text-sm font-semibold">
								<td className="px-5 py-3">Soma das zonas</td>
								<td className="px-4 py-3 text-right tabular-nums" style={{ color: '#1e3a7a' }}>
									{fmtBrl(totalOutorga)}
								</td>
								<td className="px-3 py-3"></td>
								<td className="px-4 py-3 text-right tabular-nums" style={{ color: '#c2410c' }}>
									{fmtBrl(totalCota)}
								</td>
								<td className="px-3 py-3"></td>
								<td className="px-4 py-3 text-right tabular-nums">{fmtBrl(somaZonas)}</td>
								<td className="px-4 py-3 text-left text-xs font-normal text-muted-foreground">
									{totalProc} processos
								</td>
							</tr>
						</tfoot>
					)}
				</table>
			</div>

			<div className="border-t border-border px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
				A planilha DEUSO tem 6 campos de zona de uso (um por lei de zoneamento); zonas
				repetidas num mesmo empreendimento são contadas uma só vez.{' '}
				{haDuplaContagem ? (
					<>
						Empreendimentos com mais de uma zona têm o valor contado em <strong>cada</strong> zona,
						então a soma das zonas ({fmtBrl(somaZonas)}) supera a arrecadação real (
						{fmtBrl(d.totalGeral)}).
					</>
				) : (
					<>
						Empreendimentos com mais de uma zona terão o valor contado em cada zona (hoje, apenas o
						campo da Lei 16.402/2016 está preenchido, então não há dupla contagem).
					</>
				)}
			</div>
		</div>
	);
}
