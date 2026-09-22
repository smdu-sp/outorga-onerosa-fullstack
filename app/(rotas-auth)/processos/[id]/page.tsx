/** @format */

import { TableSkeleton } from '@/components/data-table';
import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
import { buscarDetalhe } from '@/services/processos/query-functions/buscar-detalhe';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import DetalheLayout from './_components/detalhe-layout';

export default async function ProcessoDetalhePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const { ok, data } = await buscarDetalhe(id);

	if (!ok || !data) notFound();

	const processo = data as IProcessoDetalhe;

	const session = await requireAuth();
	const userId = session.usuario.sub;
	const [
		podeVerTodos,
		podeEditarDadosIniciais,
		podeEditarParcelas,
		podeEditarMonitoramento,
		podeRecalcular,
		podeReverterAntecipacao,
	] = await Promise.all([
		usuarioPermitido(userId, 'processos_ver_todos'),
		usuarioPermitido(userId, 'processos_editar_dados_iniciais'),
		usuarioPermitido(userId, 'parcelas_editar'),
		usuarioPermitido(userId, 'monitoramento_editar'),
		usuarioPermitido(userId, 'processos_recalcular'),
		usuarioPermitido(userId, 'parcelas_reverter_antecipacao'),
	]);

	return (
		<Suspense fallback={<TableSkeleton />}>
			<DetalheLayout
				processo={processo}
				permissoes={{
					podeVerTodos,
					podeEditarDadosIniciais,
					podeEditarParcelas,
					podeEditarMonitoramento,
					podeRecalcular,
					podeReverterAntecipacao,
				}}
			/>
		</Suspense>
	);
}
