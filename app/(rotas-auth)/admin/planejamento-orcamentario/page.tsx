/** @format */

import { redirect } from 'next/navigation';
import { Target } from 'lucide-react';
import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
import { listarPlanejamentos } from '@/lib/server/planejamento-orcamentario';
import DataTable from '@/components/data-table';
import Pagination from '@/components/pagination';
import { columns } from './_components/columns';
import { BotaoNovoPlanejamento } from './_components/botao-novo-planejamento';
import { BuscaAno } from './_components/busca-ano';

export const dynamic = 'force-dynamic';

export default async function PlanejamentoOrcamentarioPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const session = await requireAuth();
	const permitido =
		session.usuario.dev === true ||
		(await usuarioPermitido(session.usuario.sub, 'planejamento_orcamentario_editar'));
	if (!permitido) redirect('/');

	const { pagina = '1', limite = '10', busca = '' } = await searchParams;
	const paginaAtual = Number(pagina) || 1;
	const limiteAtual = Number(limite) || 10;

	const todos = await listarPlanejamentos();
	const anoSugerido = Math.max(new Date().getFullYear() + 1, ...todos.map((p) => p.ano + 1), 0);

	const filtrados = busca
		? todos.filter((p) => String(p.ano).includes(String(busca)))
		: todos;
	const total = filtrados.length;
	const inicio = (paginaAtual - 1) * limiteAtual;
	const planos = filtrados.slice(inicio, inicio + limiteAtual);

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 text-[28px] font-bold tracking-tight">
						<Target className="h-6 w-6 text-primary" />
						Planejamento Orçamentário
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Projeção anual (e mensal) da arrecadação, a partir da média dos últimos 3 anos e de
						parâmetros de correção (ex.: IPCA).
					</p>
				</div>
				<BotaoNovoPlanejamento anoSugerido={anoSugerido} />
			</div>

			{todos.length > 0 ? (
				<div className="flex flex-col gap-4">
					<BuscaAno />
					<DataTable columns={columns} data={planos} />
					{total > 0 && (
						<Pagination total={total} pagina={paginaAtual} limite={limiteAtual} />
					)}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
					<Target className="mb-3 h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-medium text-muted-foreground">
						Nenhum planejamento cadastrado ainda
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Use o botão &quot;Gerar planejamento&quot; para começar.
					</p>
				</div>
			)}
		</div>
	);
}
