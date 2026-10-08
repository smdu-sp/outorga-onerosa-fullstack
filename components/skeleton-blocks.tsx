/** @format */

import { cn } from '@/lib/utils';

/** Bloco de pulso — peça básica de todo skeleton. */
function Bar({ className }: { className?: string }) {
	return <div className={cn('rounded-md bg-muted', className)} />;
}

/** Espelha `PageHeader`: ícone + título + (opcional) ação à direita. */
export function PageHeaderSkeleton({
	withIcon = false,
	withActions = false,
	withBreadcrumb = false,
}: {
	withIcon?: boolean;
	withActions?: boolean;
	withBreadcrumb?: boolean;
}) {
	return (
		<div className="mb-6 animate-pulse rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-xs">
			{withBreadcrumb && <Bar className="mb-2.5 h-4 w-40" />}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					{withIcon && <Bar className="size-9 shrink-0 rounded-lg" />}
					<Bar className="h-7 w-48" />
				</div>
				{withActions && <Bar className="h-9 w-36 rounded-lg" />}
			</div>
		</div>
	);
}

/** Espelha `StatGroup` + itens de resumo (grid dividido, sem cards internos). */
export function StatGroupSkeleton({
	items = 4,
	cols = 'grid-cols-2 lg:grid-cols-4',
}: {
	items?: number;
	cols?: string;
}) {
	return (
		<div className="mb-6 animate-pulse overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div className={cn('grid gap-px bg-border', cols)}>
				{Array.from({ length: items }).map((_, i) => (
					<div key={i} className="flex flex-col gap-2 bg-card px-[18px] py-[15px]">
						<Bar className="h-3 w-20" />
						<Bar className="h-6 w-16" />
					</div>
				))}
			</div>
		</div>
	);
}

/** Espelha `FiltroBar`. */
export function FiltroBarSkeleton({ fields = 3 }: { fields?: number }) {
	return (
		<div className="mb-6 flex animate-pulse flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 shadow-xs">
			<Bar className="h-9 w-56 rounded-lg" />
			{Array.from({ length: fields }).map((_, i) => (
				<Bar key={i} className="h-9 w-24 rounded-lg" />
			))}
		</div>
	);
}

/** Card genérico de conteúdo (gráfico, seção, painel) com algumas linhas de texto. */
export function CardSkeleton({
	className,
	titleWidth = 'w-40',
	lines = 3,
	height,
}: {
	className?: string;
	titleWidth?: string;
	lines?: number;
	height?: string;
}) {
	return (
		<div
			className={cn(
				'animate-pulse rounded-xl border border-border/70 bg-card p-5 shadow-xs',
				className,
			)}>
			<Bar className={cn('mb-4 h-4', titleWidth)} />
			{height ? (
				<Bar className={cn('w-full', height)} />
			) : (
				<div className="space-y-2.5">
					{Array.from({ length: lines }).map((_, i) => (
						<Bar key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
					))}
				</div>
			)}
		</div>
	);
}

/** Tabela — cabeçalho + N linhas de pulso, mesma moldura das tabelas reais. */
export function TabelaSkeleton({ linhas = 6 }: { linhas?: number }) {
	return (
		<div className="animate-pulse overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
			<div className="h-10 border-b border-border/70 bg-muted" />
			{Array.from({ length: linhas }).map((_, i) => (
				<div key={i} className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-0">
					<Bar className="h-4 w-40" />
					<Bar className="h-5 w-16 rounded-full" />
					<Bar className="h-4 w-28" />
					<Bar className="ml-auto h-4 w-20" />
				</div>
			))}
		</div>
	);
}

/** Página inicial. */
export function HomeSkeleton() {
	return (
		<div className="mx-auto w-full px-4 py-6 pb-16 sm:px-6 lg:px-8">
			<PageHeaderSkeleton />
			<div className="mb-6 animate-pulse rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
				<Bar className="mb-4 h-4 w-32" />
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Bar key={i} className="h-16 rounded-xl" />
					))}
				</div>
			</div>
			<StatGroupSkeleton items={4} />
			<div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
				<CardSkeleton lines={5} />
				<CardSkeleton lines={5} />
			</div>
		</div>
	);
}

/** Lista de Processos. */
export function ProcessosSkeleton() {
	return (
		<div className="mx-auto w-full px-4 py-6 pb-16 sm:px-6 lg:px-8">
			<PageHeaderSkeleton withActions />
			<StatGroupSkeleton items={4} />
			<FiltroBarSkeleton fields={4} />
			<TabelaSkeleton />
		</div>
	);
}

/** Detalhe do processo — header + nav lateral + painel. */
export function DetalheProcessoSkeleton() {
	return (
		<div className="mx-auto w-full max-w-[1240px] px-4 py-6 pb-16 sm:px-6 lg:px-8">
			<div className="mb-5 animate-pulse space-y-3">
				<Bar className="h-4 w-32" />
				<div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-xs">
					<Bar className="mb-4 h-7 w-56" />
					<div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-5">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="space-y-1.5">
								<Bar className="h-2.5 w-16" />
								<Bar className="h-4 w-20" />
							</div>
						))}
					</div>
				</div>
			</div>
			<div className="flex flex-col gap-5 lg:flex-row lg:items-start">
				<div className="flex w-full animate-pulse flex-col gap-1.5 lg:w-[220px]">
					{Array.from({ length: 7 }).map((_, i) => (
						<Bar key={i} className="h-8 w-full rounded-lg" />
					))}
				</div>
				<div className="min-h-[60vh] min-w-0 flex-1 animate-pulse rounded-2xl border border-border/70 bg-card p-6 shadow-xs">
					<Bar className="mb-6 h-5 w-48" />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{Array.from({ length: 8 }).map((_, i) => (
							<Bar key={i} className="h-10 w-full rounded-lg" />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

/** Pilha de cards de um formulário (sem cabeçalho de página — para Suspense interno). */
export function FormularioCardsSkeleton() {
	return (
		<div className="flex animate-pulse flex-col gap-5">
			<CardSkeleton lines={4} />
			<CardSkeleton lines={3} />
		</div>
	);
}

/** Formulário único (ex.: confirmar criação de processo). */
export function FormularioSkeleton() {
	return (
		<div className="mx-auto w-full max-w-[1240px] px-4 py-6 pb-16 sm:px-6 lg:px-8">
			<PageHeaderSkeleton withBreadcrumb />
			<FormularioCardsSkeleton />
		</div>
	);
}

/** Dashboard com cards de resumo + duas listas (ex.: Gestão de Licenciamento). */
export function DashboardSkeleton() {
	return (
		<div className="mx-auto w-full px-4 py-6 pb-16 sm:px-6 lg:px-8">
			<PageHeaderSkeleton withActions />
			<StatGroupSkeleton items={4} />
			<div className="mt-6 grid gap-6 lg:grid-cols-2">
				<CardSkeleton lines={5} />
				<CardSkeleton lines={5} />
			</div>
		</div>
	);
}

/** Lista simples (tabela) com cabeçalho — Gestão de Licenciamento › Processos. */
export function ListaSkeleton() {
	return (
		<div className="mx-auto w-full px-4 py-6 pb-16 sm:px-6 lg:px-8">
			<PageHeaderSkeleton />
			<FiltroBarSkeleton fields={2} />
			<TabelaSkeleton />
		</div>
	);
}

/** Lista administrativa (Usuários, Permissões, Grupos, Planejamento). */
export function AdminListaSkeleton() {
	return (
		<div className="mx-auto w-full px-4 py-6 pb-16 sm:px-6 lg:px-8">
			<PageHeaderSkeleton withActions />
			<TabelaSkeleton />
		</div>
	);
}

/** Relatórios — home, com filtros + KPIs + vários cards de gráfico. */
export function RelatoriosHomeSkeleton() {
	return (
		<div className="mx-auto w-full px-4 py-6 pb-16 sm:px-6 lg:px-8">
			<PageHeaderSkeleton withActions />
			<FiltroBarSkeleton fields={4} />
			<div className="flex flex-col gap-6">
				<StatGroupSkeleton items={4} cols="grid-cols-2 md:grid-cols-3 xl:grid-cols-4" />
				<CardSkeleton height="h-40" />
				<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<CardSkeleton height="h-64" />
					<CardSkeleton height="h-64" />
				</div>
				<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<CardSkeleton height="h-64" />
					<CardSkeleton height="h-64" />
				</div>
			</div>
		</div>
	);
}

/** Relatórios — subpáginas (tipologia, zonas, saúde, mês, mapas): filtro + KPIs + gráficos/tabela. */
export function RelatorioSubpaginaSkeleton() {
	return (
		<div className="mx-auto w-full px-4 py-6 pb-16 sm:px-6 lg:px-8">
			<PageHeaderSkeleton withIcon withBreadcrumb withActions />
			<FiltroBarSkeleton fields={3} />
			<StatGroupSkeleton items={4} />
			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
				<CardSkeleton height="h-64" />
				<CardSkeleton height="h-64" />
			</div>
		</div>
	);
}
