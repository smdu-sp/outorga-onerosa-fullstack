import { Suspense } from 'react';
import { TableSkeleton } from '@/components/data-table';
import {
	anosArrecadacaoSubprefeituras,
	relatorioSubprefeituras,
} from '@/services/relatorios/subprefeituras';
import {
	descreverPeriodoSubprefeitura,
	type FiltroPeriodoSubprefeitura,
} from '@/lib/server/relatorios-subprefeituras';
import { parseFiltroPeriodo } from '@/lib/server/periodo-relatorio';
import { MapaSubprefeiturasClient } from './mapa-subprefeituras-client';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseFiltro(params: Record<string, string | string[] | undefined>): FiltroPeriodoSubprefeitura {
	return parseFiltroPeriodo(params, { anoPadrao: 'corrente', mesPadrao: 'corrente' });
}

export default async function MapaSubprefeiturasPage({ searchParams }: { searchParams: SearchParams }) {
	const params = await searchParams;
	const filtro = parseFiltro(params);
	const periodoLabel = descreverPeriodoSubprefeitura(filtro);

	return (
		<Suspense fallback={<TableSkeleton />}>
			<MapaSubprefeiturasConteudo filtro={filtro} periodoLabel={periodoLabel} />
		</Suspense>
	);
}

async function MapaSubprefeiturasConteudo({
	filtro,
	periodoLabel,
}: {
	filtro: FiltroPeriodoSubprefeitura;
	periodoLabel: string;
}) {
	const [resp, anosDisponiveis] = await Promise.all([
		relatorioSubprefeituras(filtro),
		anosArrecadacaoSubprefeituras(),
	]);
	const subprefeituras = resp.ok ? (resp.data ?? []) : [];

	return (
		<MapaSubprefeiturasClient
			key={[
				filtro.ano ?? 't',
				filtro.mes ?? 't',
				filtro.dataInicio?.toISOString() ?? '',
				filtro.dataFim?.toISOString() ?? '',
			].join('-')}
			subprefeituras={subprefeituras}
			filtro={filtro}
			periodoLabel={periodoLabel}
			anosDisponiveis={anosDisponiveis}
		/>
	);
}
