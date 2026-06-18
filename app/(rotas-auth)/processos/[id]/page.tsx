/** @format */

import { TableSkeleton } from '@/components/data-table';
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

	return (
		<Suspense fallback={<TableSkeleton />}>
			<DetalheLayout processo={processo} />
		</Suspense>
	);
}
