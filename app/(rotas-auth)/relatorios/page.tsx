/** @format */

import { Suspense } from 'react';
import { TableSkeleton } from '@/components/data-table';
import { relatorio } from '@/services/relatorios';
import { IRelatorio } from '@/types/relatorio';
import { KpiCards } from './_components/kpi-cards';
import { CalendarioArrecadacao } from './_components/calendario';
import { GraficoPrevistoRealizado } from './_components/grafico-barras';
import { GraficoAcumulado } from './_components/grafico-acumulado';
import { GraficoComposicao } from './_components/grafico-composicao';
import { HeatmapArrecadacao } from './_components/heatmap';
import { ComparativoAnual } from './_components/comparativo-anual';
import { Top10Processos } from './_components/top10';
import { CardMapaDistritos } from './_components/card-mapa-distritos';
import { CardMapaSubprefeituras } from './_components/card-mapa-subprefeituras';
import { PdeCota } from './_components/pde-cota';
import { ProjecaoFechamento } from './_components/projecao';
import { FiltrosRelatorio } from './_components/filtros-relatorio';

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

	const ano = get('ano') ? Number(get('ano')) : undefined;
	const tipo = get('tipo') ?? 'todos';
	const status = get('status') ?? 'todos';
	const sub = get('sub') ?? 'todas';

	const resp = await relatorio(ano);
	const d: IRelatorio | null = resp.ok ? resp.data : null;

	const anoAtual = d?.anoAtual ?? new Date().getFullYear();
	const anoMaximo = Math.max(anoAtual, new Date().getFullYear());
	const anosDisponiveis = Array.from({ length: 5 }, (_, i) => anoMaximo - 4 + i);
	const subprefeituras = d?.subs.map((s) => s.nome) ?? [];

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-5 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-[28px] font-bold tracking-tight">Relatórios de Arrecadação</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Outorga Onerosa do Direito de Construir — São Paulo · Ano {anoAtual}
					</p>
				</div>
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

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_2fr]">
					<GraficoComposicao d={d} />
					<HeatmapArrecadacao d={d} />
				</div>

				<ComparativoAnual d={d} />
				<Top10Processos d={d} filtroTipo={tipo} filtroStatus={status} filtroSub={sub} />

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<CardMapaSubprefeituras d={d} />
					<CardMapaDistritos d={d} />
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<PdeCota d={d} />
					<ProjecaoFechamento d={d} />
				</div>

			</div>
		</div>
	);
}
