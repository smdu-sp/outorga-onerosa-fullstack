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
import { MapaDistritosClient } from './mapa-distritos-client';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseFiltro(params: Record<string, string | string[] | undefined>): FiltroPeriodoDistrito {
	const get = (key: string) => {
		const v = params[key];
		return typeof v === 'string' ? v : undefined;
	};

	const hoje = new Date();
	const filtro: FiltroPeriodoDistrito = {};
	const anoRaw = get('ano');
	const mesRaw = get('mes');

	if (anoRaw === 'todos') {
		// filtro.ano permanece undefined → sem filtro de ano
	} else if (anoRaw) {
		const ano = Number(anoRaw);
		if (!Number.isNaN(ano)) filtro.ano = ano;
	} else {
		filtro.ano = hoje.getFullYear();
	}

	if (mesRaw === 'todos') {
		// filtro.mes permanece undefined → sem filtro de mês
	} else if (mesRaw) {
		const mes = Number(mesRaw);
		if (!Number.isNaN(mes) && mes >= 0 && mes <= 11) filtro.mes = mes;
	} else {
		filtro.mes = hoje.getMonth();
	}

	return filtro;
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
			key={`${filtro.ano ?? 't'}-${filtro.mes ?? 't'}`}
			distritos={distritos}
			filtro={filtro}
			periodoLabel={periodoLabel}
			anosDisponiveis={anosDisponiveis}
		/>
	);
}
