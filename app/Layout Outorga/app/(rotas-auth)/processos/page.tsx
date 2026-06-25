/** @format */

import DataTable, { TableSkeleton } from '@/components/data-table';
import Pagination from '@/components/pagination';
import { buscarTudo } from '@/services/processos/query-functions/buscar-tudo';
import { IProcesso, IProcessosPaginado } from '@/types/processo';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { columns } from '../_components/columns';
import { SearchProcessos } from './_components/search-processos';

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
	let { pagina = 1, limite = 10, total = 0 } = await searchParams;
	const { busca = '' } = await searchParams;

	let dataProcessos: IProcesso[] = [];
	const response = await buscarTudo(+pagina, +limite, busca as string);
	const { data, ok } = response;
	const dataResponse = data as IProcessosPaginado;

	if (ok && dataResponse) {
		pagina = dataResponse.pagina || 1;
		limite = dataResponse.limite || 10;
		total = dataResponse.total || 0;
		dataProcessos = dataResponse.data || [];
	}

	const countPDE = dataProcessos.filter((p) => p.tipo === 'PDE').length;
	const countCOTA = dataProcessos.filter((p) => p.tipo === 'COTA').length;

	return (
		<div className="w-full pb-8">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 mb-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Processos</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Consulte e gerencie todos os processos de Outorga Onerosa
					</p>
				</div>
				<Button asChild>
					<Link href="/processos/novo">
						<Plus className="h-4 w-4" />
						Novo processo
					</Link>
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
				<div className="rounded-lg border bg-card p-4">
					<div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">
						<FolderOpen className="h-3.5 w-3.5" />
						Total
					</div>
					<div className="text-2xl font-bold tabular-nums">{+total}</div>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<div className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">
						PDE (pág.)
					</div>
					<div className="text-2xl font-bold tabular-nums text-primary">
						{countPDE}
					</div>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<div className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">
						COTA (pág.)
					</div>
					<div className="text-2xl font-bold tabular-nums text-orange-600">
						{countCOTA}
					</div>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<div className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">
						Página
					</div>
					<div className="text-2xl font-bold tabular-nums">{+pagina}</div>
				</div>
			</div>

			{/* Toolbar */}
			<div className="flex items-center gap-3 mb-4">
				<Suspense>
					<SearchProcessos defaultValue={busca as string} />
				</Suspense>
				{busca && (
					<span className="text-sm text-muted-foreground">
						Resultados para{' '}
						<strong className="text-foreground font-medium">"{busca}"</strong>
					</span>
				)}
			</div>

			{/* Table */}
			<div className="flex flex-col gap-4">
				<DataTable columns={columns} data={dataProcessos} />
				{dataProcessos.length > 0 && (
					<Pagination total={+total} limite={+limite} pagina={+pagina} />
				)}
			</div>
		</div>
	);
}
