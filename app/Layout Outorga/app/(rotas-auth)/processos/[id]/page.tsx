/** @format */

import { TableSkeleton } from '@/components/data-table';
import { buscarPorId } from '@/services/processos/query-functions/buscar-por-id';
import { IProcesso } from '@/types/processo';
import { ChevronRight, House } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import DetalheLayout from './_components/detalhe-layout';

export default async function ProcessoDetalhePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const { ok, data } = await buscarPorId(id);

	if (!ok || !data) notFound();

	const processo = data as IProcesso;

	return (
		<div className="w-full pb-8">
			{/* Breadcrumb */}
			<nav
				aria-label="Breadcrumb"
				className="flex items-center gap-1 text-sm text-muted-foreground mb-5">
				<Link href="/" className="hover:text-foreground transition-colors">
					<House className="h-3.5 w-3.5" />
					<span className="sr-only">Início</span>
				</Link>
				<ChevronRight className="h-3.5 w-3.5 opacity-50" />
				<Link href="/processos" className="hover:text-foreground transition-colors">
					Processos
				</Link>
				<ChevronRight className="h-3.5 w-3.5 opacity-50" />
				<span className="text-foreground font-mono text-xs font-medium">
					{processo.num_processo}
				</span>
			</nav>

			<Suspense fallback={<TableSkeleton />}>
				<DetalheLayout processo={processo} />
			</Suspense>
		</div>
	);
}
