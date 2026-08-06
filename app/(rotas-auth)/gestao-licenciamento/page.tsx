/** @format */

import Link from 'next/link';
import { Suspense } from 'react';
import { ClipboardList, FolderOpen } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { buscarDashboardLicenciamento } from '@/services/licenciamento/query-functions';
import { TableSkeleton } from '@/components/data-table';

export default function GestaoLicenciamentoPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<Dashboard searchParams={searchParams} />
		</Suspense>
	);
}

async function Dashboard({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	await requireAuth();
	const params = await searchParams;
	const coordenadoria = (params.coordenadoria as string) ?? 'TODAS';
	const response = await buscarDashboardLicenciamento(coordenadoria);
	const stats = response.data ?? {
		ativos: 0,
		encerrados: 0,
		sem_tecnico: 0,
		prioritarios: 0,
		por_situacao: [],
		por_coordenadoria: [],
	};

	const cards = [
		{ label: 'Ativos', value: stats.ativos, href: '/gestao-licenciamento/processos?status=ATIVO' },
		{
			label: 'Encerrados',
			value: stats.encerrados,
			href: '/gestao-licenciamento/processos?status=ENCERRADO',
		},
		{
			label: 'Sem técnico',
			value: stats.sem_tecnico,
			href: '/gestao-licenciamento/processos?status=ATIVO',
		},
		{
			label: 'Prioritários',
			value: stats.prioritarios,
			href: '/gestao-licenciamento/processos?status=ATIVO',
		},
	];

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="text-sm font-medium text-muted-foreground">Módulo</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Gestão de Processos de Licenciamento
					</h1>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
						Tramitação e análise das coordenadorias RESID, SERVIN, COMIN, CAEPP e
						PARHIS. Separado do módulo de Outorga Onerosa.
					</p>
				</div>
				<Link
					href="/gestao-licenciamento/processos"
					className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-xs hover:bg-muted/50">
					<FolderOpen className="size-4" />
					Ver processos
				</Link>
			</div>

			<div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{cards.map((c) => (
					<Link
						key={c.label}
						href={c.href}
						className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-xs transition hover:border-border">
						<p className="text-sm text-muted-foreground">{c.label}</p>
						<p className="mt-1 text-3xl font-semibold tabular-nums">{c.value}</p>
					</Link>
				))}
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<section className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
					<div className="mb-4 flex items-center gap-2">
						<ClipboardList className="size-4 text-muted-foreground" />
						<h2 className="font-semibold">Ativos por situação</h2>
					</div>
					{stats.por_situacao.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhum processo cadastrado ainda. Após a migração e o seed, importe a
							planilha piloto ou cadastre processos.
						</p>
					) : (
						<ul className="space-y-2">
							{stats.por_situacao.map((s) => (
								<li
									key={s.situacao_id ?? s.nome}
									className="flex items-center justify-between text-sm">
									<span>{s.nome}</span>
									<span className="tabular-nums font-medium">{s.total}</span>
								</li>
							))}
						</ul>
					)}
				</section>

				<section className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
					<h2 className="mb-4 font-semibold">Ativos por coordenadoria</h2>
					{stats.por_coordenadoria.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Sem distribuição por coordenadoria no momento.
						</p>
					) : (
						<ul className="space-y-2">
							{stats.por_coordenadoria.map((c) => (
								<li
									key={c.coordenadoria}
									className="flex items-center justify-between text-sm">
									<span>{c.coordenadoria}</span>
									<span className="tabular-nums font-medium">{c.total}</span>
								</li>
							))}
						</ul>
					)}
				</section>
			</div>
		</div>
	);
}
