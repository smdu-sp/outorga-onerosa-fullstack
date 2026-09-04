/** @format */

import { Suspense } from 'react';
import Link from 'next/link';
import { Building2, HeartPulse, LandPlot, Target } from 'lucide-react';
import { TableSkeleton } from '@/components/data-table';
import { relatorio } from '@/services/relatorios';
import { IRelatorio } from '@/types/relatorio';
import { descreverPeriodo, parseFiltroPeriodo } from '@/lib/server/periodo-relatorio';
import { temIntervaloDatas } from '@/lib/parcelas-utils';
import { KpiCards } from './_components/kpi-cards';
import { CalendarioArrecadacao } from './_components/calendario';
import { GraficoPrevistoRealizado } from './_components/grafico-barras';
import { GraficoAcumulado } from './_components/grafico-acumulado';
import { GraficoComposicao } from './_components/grafico-composicao';
import { GraficoOrigemSistema } from './_components/grafico-origem';
import { SecaoTipologiaUso } from './_components/secao-tipologia';
import { HeatmapArrecadacao } from './_components/heatmap';
import { ComparativoAnual } from './_components/comparativo-anual';
import { Top10Processos } from './_components/top10';
import { CardMapaDistritos } from './_components/card-mapa-distritos';
import { CardMapaSubprefeituras } from './_components/card-mapa-subprefeituras';
import { PdeCota } from './_components/pde-cota';
import { ProjecaoFechamento } from './_components/projecao';
import { FiltrosRelatorio } from './_components/filtros-relatorio';
import { BotaoExportarExcel } from './_components/botao-exportar-excel';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RelatoriosPage({ searchParams }: { searchParams: SearchParams }) {
	const params = await searchParams;
	return (
		<Suspense fallback={<TableSkeleton />}>
			<RelatoriosHome params={params} />
		</Suspense>
	);
}

async function RelatoriosHome({ params }: { params: Record<string, string | string[] | undefined> }) {
	const get = (key: string) => {
		const v = params[key];
		return typeof v === 'string' ? v : undefined;
	};

	const anoRaw = get('ano');
	const filtroPeriodo = parseFiltroPeriodo(params, { anoPadrao: 'corrente', mesPadrao: 'omitir' });
	const temRange = temIntervaloDatas(filtroPeriodo);
	const filtroHome = temRange
		? { dataInicio: filtroPeriodo.dataInicio, dataFim: filtroPeriodo.dataFim }
		: anoRaw === 'todos'
			? { todosAnos: true as const }
			: { ano: filtroPeriodo.ano };

	const tipo = get('tipo') ?? 'todos';
	const status = get('status') ?? 'todos';
	const sub = get('sub') ?? 'todas';

	const resp = await relatorio(filtroHome);
	const d: IRelatorio | null = resp.ok ? resp.data : null;

	const anoAtual = d?.anoAtual ?? new Date().getFullYear();
	const anoMaximo = Math.max(anoAtual, new Date().getFullYear());
	const anosDisponiveis = Array.from({ length: 5 }, (_, i) => anoMaximo - 4 + i);
	const subprefeituras = d?.subs.map((s) => s.nome) ?? [];
	const periodoLabel = temRange
		? descreverPeriodo(filtroPeriodo)
		: anoRaw === 'todos'
			? 'Todo o período'
			: `Ano ${anoAtual}`;

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-5 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-[28px] font-bold tracking-tight">Relatórios de Arrecadação</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Outorga Onerosa do Direito de Construir — São Paulo · {periodoLabel}
					</p>
				</div>
				<Suspense>
					<BotaoExportarExcel tipo="home" />
				</Suspense>
			</div>

			<Suspense>
				<FiltrosRelatorio subprefeituras={subprefeituras} anosDisponiveis={anosDisponiveis} />
			</Suspense>

			<div className="flex flex-col gap-6">
				<KpiCards d={d} />
				<CalendarioArrecadacao d={d} />

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<GraficoPrevistoRealizado d={d} />
					<GraficoAcumulado d={d} />
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<GraficoComposicao d={d} />
					<GraficoOrigemSistema d={d} />
				</div>

				<HeatmapArrecadacao d={d} />

				<SecaoTipologiaUso d={d} />

				<ComparativoAnual d={d} />
				<Top10Processos
					d={d}
					anosDisponiveis={anosDisponiveis}
					filtroTipo={tipo}
					filtroStatus={status}
					filtroSub={sub}
				/>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<CardMapaSubprefeituras d={d} />
					<CardMapaDistritos d={d} />
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<PdeCota d={d} />
					<ProjecaoFechamento d={d} />
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
					<Link
						href="/relatorios/planejamento-orcamentario"
						className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5">
						<div className="flex items-center gap-3">
							<Target className="h-5 w-5 text-primary" />
							<div>
								<div className="text-sm font-semibold">Planejamento × Executado</div>
								<div className="text-xs text-muted-foreground">
									Orçamento planejado comparado com a arrecadação real.
								</div>
							</div>
						</div>
						<span className="shrink-0 text-xs text-muted-foreground group-hover:text-primary">
							Ver →
						</span>
					</Link>

					<Link
						href="/relatorios/saude-arrecadacao"
						className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5">
						<div className="flex items-center gap-3">
							<HeartPulse className="h-5 w-5 text-primary" />
							<div>
								<div className="text-sm font-semibold">Saúde da arrecadação</div>
								<div className="text-xs text-muted-foreground">
									Quebra, inadimplência, antecipação e tempo de pagamento.
								</div>
							</div>
						</div>
						<span className="shrink-0 text-xs text-muted-foreground group-hover:text-primary">
							Ver →
						</span>
					</Link>

					<Link
						href="/relatorios/zonas-uso"
						className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5">
						<div className="flex items-center gap-3">
							<LandPlot className="h-5 w-5 text-primary" />
							<div>
								<div className="text-sm font-semibold">Por zona de uso</div>
								<div className="text-xs text-muted-foreground">
									Outorga × Cota por zona (Lei 16.402/2016).
								</div>
							</div>
						</div>
						<span className="shrink-0 text-xs text-muted-foreground group-hover:text-primary">
							Ver →
						</span>
					</Link>

					<Link
						href="/relatorios/tipologia-uso"
						className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5">
						<div className="flex items-center gap-3">
							<Building2 className="h-5 w-5 text-primary" />
							<div>
								<div className="text-sm font-semibold">Tipologia de uso</div>
								<div className="text-xs text-muted-foreground">
									Residencial, Não Residencial e Uso Misto.
								</div>
							</div>
						</div>
						<span className="shrink-0 text-xs text-muted-foreground group-hover:text-primary">
							Ver →
						</span>
					</Link>
				</div>

			</div>
		</div>
	);
}
