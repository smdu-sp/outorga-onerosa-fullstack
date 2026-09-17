/** @format */

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, LandPlot } from 'lucide-react';
import { RelatorioSubpaginaSkeleton } from '@/components/skeleton-blocks';
import { PageHeader, PageShell } from '@/components/page-shell';
import { FiltroBar, FiltroChip, filtroLabelClass, filtroSepClass } from '@/components/filtro-ui';
import { relatorioZonas } from '@/services/relatorios/zonas';
import type { IRelatorioZonas } from '@/types/relatorio';
import { parseFiltroPeriodo, descreverPeriodo } from '@/lib/server/periodo-relatorio';
import { temIntervaloDatas } from '@/lib/parcelas-utils';
import { FiltrosPeriodoDatas } from '../_components/filtros-periodo-datas';
import { BotaoExportarExcel } from '../_components/botao-exportar-excel';

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

function descreverPeriodoMesAno(ano: number | null, mes: number | null): string {
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
	const filtro = parseFiltroPeriodo(params, { anoPadrao: 'corrente', mesPadrao: 'omitir' });
	const temRange = temIntervaloDatas(filtro);

	const ano = temRange ? undefined : filtro.ano;
	const mes = temRange ? undefined : filtro.mes;
	const intervalo = temRange
		? { dataInicio: filtro.dataInicio, dataFim: filtro.dataFim }
		: undefined;

	return (
		<Suspense
			key={`${ano ?? 't'}-${mes ?? 't'}-${filtro.dataInicio?.toISOString() ?? ''}-${filtro.dataFim?.toISOString() ?? ''}`}
			fallback={<RelatorioSubpaginaSkeleton />}>
			<Conteudo
				ano={ano}
				mes={mes}
				intervalo={intervalo}
				periodoLabel={descreverPeriodo(filtro)}
			/>
		</Suspense>
	);
}

async function Conteudo({
	ano,
	mes,
	intervalo,
	periodoLabel,
}: {
	ano?: number;
	mes?: number;
	intervalo?: { dataInicio?: Date; dataFim?: Date };
	periodoLabel: string;
}) {
	const resp = await relatorioZonas(ano, mes, intervalo);
	if (!resp.ok || !resp.data) notFound();
	const d = resp.data;

	return (
		<PageShell>
			<PageHeader
				icon={LandPlot}
				title="Arrecadação por zona de uso"
				breadcrumb={
					<Link
						href="/relatorios"
						className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
						<ArrowLeft className="h-3.5 w-3.5" />
						Relatórios
						<span className="mx-1 opacity-40">/</span>
						<span className="text-foreground">Por zona de uso</span>
					</Link>
				}
				actions={
					<Suspense>
						<BotaoExportarExcel tipo="zonas" />
					</Suspense>
				}>
				<span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
					Outorga × Cota (Lei 16.402/2016), AIU não incluída · {periodoLabel}
				</span>
			</PageHeader>

			<FiltroBar>
				<Filtros anos={d.anos} anoAtual={d.ano} mesAtual={d.mes} />
				<div className={filtroSepClass} />
				<FiltrosPeriodoDatas />
			</FiltroBar>

			<Tabela d={d} />
		</PageShell>
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

	return (
		<>
			<span className={filtroLabelClass}>Ano</span>
			<FiltroChip href={hrefAno('todos')} ativo={anoAtual == null}>
				Todos
			</FiltroChip>
			{anos.map((a) => (
				<FiltroChip key={a} href={hrefAno(a)} ativo={anoAtual === a}>
					{a}
				</FiltroChip>
			))}
			<div className={filtroSepClass} />
			<span className={filtroLabelClass}>Mês</span>
			<FiltroChip href={hrefMes('todos')} ativo={mesAtual == null}>
				Todos
			</FiltroChip>
			{MESES_CURTO.map((m, i) => (
				<FiltroChip key={m} href={hrefMes(i)} ativo={mesAtual === i}>
					{m}
				</FiltroChip>
			))}
		</>
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
		<div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
				<div className="text-sm font-semibold">
					Outorga × Cota por zona
					<span className="ml-2 text-xs font-normal text-muted-foreground">
						· {descreverPeriodoMesAno(d.ano, d.mes)}
					</span>
				</div>
				<div className="text-xs text-muted-foreground">
					{d.linhas.length} zonas · arrecadação real{' '}
					<span className="font-semibold text-foreground">{fmtBrl(d.totalGeral)}</span>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full border-separate border-spacing-0 text-sm">
					<thead>
						<tr className="bg-primary">
							<th className="whitespace-nowrap px-3.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Zona</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Outorga</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Proc.</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Cota</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Proc.</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Total</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">% do total</th>
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
								<tr key={l.zona} className="border-t border-border transition-colors hover:bg-primary-soft">
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
