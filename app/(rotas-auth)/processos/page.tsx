/** @format */

import { ProcessosSkeleton } from '@/components/skeleton-blocks';
import { PageHeader, PageShell, StatGroup } from '@/components/page-shell';
import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
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
		<Suspense fallback={<ProcessosSkeleton />}>
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
	const vencimento = (params.vencimento as string) ?? '';
	const pendencia = (params.pendencia as string) ?? '';
	const novo = (params.novo as string) ?? 'TODOS';

	let dataProcessos: IProcesso[] = [];
	let total = 0;
	let stats: IEstatisticasProcessos = {
		total: 0,
		em_pagamento: 0,
		quitados: 0,
		quebras: 0,
		valor_quebra: 0,
	};

	const session = await requireAuth();
	const [response, statsResponse, podeCriar, podeVerFiltroNovo] = await Promise.all([
		buscarTudo(pagina, limite, busca, tipo, status, vencimento, pendencia, novo),
		buscarEstatisticas(),
		usuarioPermitido(session.usuario.sub, 'processos_criar'),
		usuarioPermitido(session.usuario.sub, 'parcelas_editar'),
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
		<PageShell>
			<PageHeader
				title="Processos"
				actions={
					podeCriar && (
						<Link
							href="/processos/novo"
							className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-primary/90">
							<Plus className="h-4 w-4" />
							Novo processo
						</Link>
					)
				}
			/>

			<StatGroup className="mb-[22px]">
				<div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
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
						sub={`${fmtBRL(stats.valor_quebra)} não recebido`}
					/>
				</div>
			</StatGroup>

			<Suspense>
				<ToolbarLista
					buscaInicial={busca}
					tipoInicial={tipo}
					statusInicial={status}
					vencimentoInicial={vencimento}
					pendenciaInicial={pendencia}
					novoInicial={novo}
					mostrarFiltroNovo={podeVerFiltroNovo}
				/>
			</Suspense>

			<TabelaLista processos={dataProcessos} />

			<PaginacaoLista total={total} pagina={pagina} limite={limite} />
		</PageShell>
	);
}
