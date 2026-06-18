/** @format */

import { TableSkeleton } from '@/components/data-table';
import { buscarTudo } from '@/services/processos/query-functions/buscar-tudo';
import { buscarEstatisticas } from '@/services/processos/query-functions/estatisticas';
import { IEstatisticasProcessos, IProcesso, IProcessosPaginado } from '@/types/processo';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { PaginacaoLista } from './_components/paginacao-lista';
import { StatCard } from './_components/stat-card';
import { TabelaLista } from './_components/tabela-lista';
import { ToolbarLista } from './_components/toolbar-lista';

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function Processos({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<Home searchParams={searchParams} />
		</Suspense>
	);
}

async function Home({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await searchParams;
	let pagina = +(params.pagina ?? 1);
	let limite = +(params.limite ?? 10);
	const busca = (params.busca as string) ?? '';
	const tipo = (params.tipo as string) ?? 'TODOS';
	const status = (params.status as string) ?? 'TODOS';

	let dataProcessos: IProcesso[] = [];
	let total = 0;
	let stats: IEstatisticasProcessos = {
		total: 0,
		em_pagamento: 0,
		quitados: 0,
		quebras: 0,
		a_receber: 0,
	};

	const [response, statsResponse] = await Promise.all([
		buscarTudo(pagina, limite, busca, tipo, status),
		buscarEstatisticas(),
	]);

	const { data, ok } = response;
	const dataResponse = data as IProcessosPaginado;

	if (ok && dataResponse) {
		pagina = dataResponse.pagina || 1;
		limite = dataResponse.limite || 10;
		total = dataResponse.total || 0;
		dataProcessos = dataResponse.data || [];
	}

	if (statsResponse.ok && statsResponse.data) {
		stats = statsResponse.data;
	}

	return (
		<div className="mx-auto w-full max-w-[1240px] px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
				<div>
					<h1 className="m-0 text-[30px] font-bold tracking-[-0.01em]">Processos</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						Consulte, acompanhe e edite os processos de outorga onerosa.
					</p>
				</div>
				<Link
					href="/processos/novo"
					className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-primary/90">
					<Plus className="h-4 w-4" />
					Novo processo
				</Link>
			</div>

			<div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
				<StatCard
					icon="layers"
					color="blue"
					label="Total"
					value={stats.total}
					sub="processos cadastrados"
				/>
				<StatCard
					icon="clock"
					color="amber"
					label="Em pagamento"
					value={stats.em_pagamento}
					sub="parcelas em curso"
				/>
				<StatCard
					icon="check"
					color="green"
					label="Quitados"
					value={stats.quitados}
					sub="contrapartida concluída"
				/>
				<StatCard
					icon="trendingDown"
					color="red"
					label="Em quebra"
					value={stats.quebras}
					sub={`${fmtBRL(stats.a_receber)} a receber`}
				/>
			</div>

			<Suspense>
				<ToolbarLista
					buscaInicial={busca}
					tipoInicial={tipo}
					statusInicial={status}
				/>
			</Suspense>

			<TabelaLista processos={dataProcessos} />

			<PaginacaoLista total={total} pagina={pagina} limite={limite} />
		</div>
	);
}
