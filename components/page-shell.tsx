/** @format */

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageShellMax = 'default' | 'narrow' | 'wide';

const MAX_CLASS: Record<PageShellMax, string> = {
	default: '',
	narrow: 'max-w-[920px]',
	wide: 'max-w-[1240px]',
};

/**
 * Container padrão de página. Substitui os diversos
 * `mx-auto w-full px-4 py-7 pb-[60px] sm:px-8` / `container` espalhados.
 */
export function PageShell({
	max = 'default',
	className,
	children,
}: {
	max?: PageShellMax;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				'mx-auto w-full px-4 py-6 pb-16 sm:px-6 lg:px-8',
				MAX_CLASS[max],
				className,
			)}>
			{children}
		</div>
	);
}

/**
 * Cabeçalho padrão de página — envelopado em card, sem subtítulo.
 * Use `children` para chips informativos (período, contagem, etc.).
 */
export function PageHeader({
	icon: Icon,
	eyebrow,
	title,
	badge,
	actions,
	breadcrumb,
	className,
	children,
}: {
	icon?: LucideIcon;
	eyebrow?: ReactNode;
	title: ReactNode;
	badge?: ReactNode;
	actions?: ReactNode;
	breadcrumb?: ReactNode;
	className?: string;
	children?: ReactNode;
}) {
	return (
		<div
			className={cn(
				'mb-6 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-xs',
				className,
			)}>
			{breadcrumb && <div className="mb-2.5">{breadcrumb}</div>}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="min-w-0">
					{eyebrow && (
						<p className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
							{eyebrow}
						</p>
					)}
					<div className="flex flex-wrap items-center gap-2">
						{Icon && (
							<div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
								<Icon className="size-5" />
							</div>
						)}
						<h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
							{title}
						</h1>
						{badge}
					</div>
					{children && (
						<div className="mt-2 flex flex-wrap items-center gap-2">{children}</div>
					)}
				</div>
				{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
			</div>
		</div>
	);
}

/**
 * Bloco de seção padrão. Substitui os
 * `rounded-2xl border border-border/70 bg-card p-5 shadow-xs` repetidos.
 */
export function SectionCard({
	icon: Icon,
	title,
	actions,
	className,
	bodyClassName,
	children,
}: {
	icon?: LucideIcon;
	title?: ReactNode;
	actions?: ReactNode;
	className?: string;
	bodyClassName?: string;
	children: ReactNode;
}) {
	return (
		<section
			className={cn(
				'rounded-2xl border border-border/70 bg-card p-5 shadow-xs',
				className,
			)}>
			{(title || actions) && (
				<div className="mb-4 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						{Icon && <Icon className="size-4 text-muted-foreground" />}
						{title && <h2 className="text-base font-semibold">{title}</h2>}
					</div>
					{actions}
				</div>
			)}
			<div className={bodyClassName}>{children}</div>
		</section>
	);
}

/**
 * "Card envolvendo todos" os cards de resumo — destaque para o bloco de KPIs.
 * Os itens ficam soltos (sem card próprio), separados por divisórias — só o
 * envelope tem borda/sombra. O grid interno (colunas/breakpoints) continua
 * sendo responsabilidade de quem usa; use `divide-x divide-y divide-border`
 * no grid em vez de `gap-*`.
 */
export function StatGroup({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				'overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
				className,
			)}>
			{children}
		</div>
	);
}
