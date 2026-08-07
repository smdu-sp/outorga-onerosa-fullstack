import { Suspense } from 'react';
import { TableSkeleton } from '@/components/data-table';
import {
	anosArrecadacaoDistritos,
	relatorioDistritos,
} from '@/services/relatorios/distritos';
import {
	descreverPeriodoDistrito,
	type FiltroPeriodoDistrito,
} from '@/lib/server/relatorios-distritos';
import { parseFiltroPeriodo } from '@/lib/server/periodo-relatorio';
import { MapaDistritosClient } from './mapa-distritos-client';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseFiltro(params: Record<string, string | string[] | undefined>): FiltroPeriodoDistrito {
	return parseFiltroPeriodo(params, { anoPadrao: 'corrente', mesPadrao: 'corrente' });
}

export default async function MapaDistritosPage({ searchParams }: { searchParams: SearchParams }) {
	const params = await searchParams;
	const filtro = parseFiltro(params);
	const periodoLabel = descreverPeriodoDistrito(filtro);

	return (
		<Suspense fallback={<TableSkeleton />}>
			<MapaDistritosConteudo filtro={filtro} periodoLabel={periodoLabel} />
		</Suspense>
	);
}

async function MapaDistritosConteudo({
	filtro,
	periodoLabel,
}: {
	filtro: FiltroPeriodoDistrito;
	periodoLabel: string;
}) {
	const [resp, anosDisponiveis] = await Promise.all([
		relatorioDistritos(filtro),
		anosArrecadacaoDistritos(),
	]);
	const distritos = resp.ok ? (resp.data ?? []) : [];

	return (
		<MapaDistritosClient
			key={[
				filtro.ano ?? 't',
				filtro.mes ?? 't',
				filtro.dataInicio?.toISOString() ?? '',
				filtro.dataFim?.toISOString() ?? '',
			].join('-')}
			distritos={distritos}
			filtro={filtro}
			periodoLabel={periodoLabel}
			anosDisponiveis={anosDisponiveis}
		/>
	);
}
