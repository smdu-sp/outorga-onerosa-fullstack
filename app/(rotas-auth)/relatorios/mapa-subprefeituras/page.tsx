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
import { MapaSubprefeiturasClient } from './mapa-subprefeituras-client';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseFiltro(params: Record<string, string | string[] | undefined>): FiltroPeriodoSubprefeitura {
	const get = (key: string) => {
		const v = params[key];
		return typeof v === 'string' ? v : undefined;
	};

	const hoje = new Date();
	const filtro: FiltroPeriodoSubprefeitura = {};
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
			key={`${filtro.ano ?? 't'}-${filtro.mes ?? 't'}`}
			subprefeituras={subprefeituras}
			filtro={filtro}
			periodoLabel={periodoLabel}
			anosDisponiveis={anosDisponiveis}
		/>
	);
}
