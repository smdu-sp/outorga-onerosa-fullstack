'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Chrome + layout padrão das barras de filtro (Processos, Relatórios, Gestão de
 * Licenciamento). Sempre uma linha só — em telas estreitas rola horizontalmente
 * em vez de quebrar para outra linha. Use `className` só para ajustar o `gap`.
 */
export function FiltroBar({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div
			className={cn(
				'scroll-x-visible mb-6 flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-xl border border-border/70 bg-card px-2.5 py-2 shadow-xs sm:gap-2.5 sm:px-3.5 sm:py-3',
				className,
			)}>
			{children}
		</div>
	);
}

export const filtroSelectClass =
	'h-8 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring sm:h-9 sm:px-2.5 sm:text-sm';
export const filtroInputClass = filtroSelectClass;
export const filtroLabelClass =
	'hidden text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground sm:inline';
export const filtroSepClass = 'mx-0.5 h-4 w-px shrink-0 bg-border sm:mx-1';

/** Chip de filtro (pílula) — usado para conjuntos maiores de opções (anos, meses). */
export function FiltroChip({
	href,
	ativo,
	disabled,
	onClick,
	children,
}: {
	href?: string;
	ativo: boolean;
	disabled?: boolean;
	onClick?: () => void;
	children: ReactNode;
}) {
	const className = cn(
		'shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-colors sm:px-3 sm:py-1',
		ativo
			? 'border-primary bg-primary text-primary-foreground'
			: 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
		disabled && 'pointer-events-none opacity-50',
	);

	if (href) {
		return (
			<Link href={href} className={cn(className, 'no-underline')}>
				{children}
			</Link>
		);
	}

	return (
		<button type="button" onClick={onClick} disabled={disabled} className={className}>
			{children}
		</button>
	);
}

/** Grupo segmentado (poucas opções mutuamente exclusivas) — mesmo visual em todo o sistema. */
export function FiltroSegmented<T extends string>({
	opcoes,
	valor,
	onChange,
	disabled,
}: {
	opcoes: { value: T; label: string }[];
	valor: T;
	onChange: (value: T) => void;
	disabled?: boolean;
}) {
	return (
		<div className="inline-flex shrink-0 gap-0.5 rounded-lg border border-border bg-secondary p-[3px]">
			{opcoes.map((opcao) => (
				<button
					key={opcao.value}
					type="button"
					disabled={disabled}
					onClick={() => onChange(opcao.value)}
					className={cn(
						'whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 sm:px-3 sm:py-1.5',
						valor === opcao.value
							? 'bg-primary text-primary-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground',
					)}>
					{opcao.label}
				</button>
			))}
		</div>
	);
}

/** Botão "Limpar filtros/período" padrão. */
export function FiltroClearButton({
	onClick,
	disabled,
	children = 'Limpar filtros',
}: {
	onClick: () => void;
	disabled?: boolean;
	children?: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">
			{children}
		</button>
	);
}
