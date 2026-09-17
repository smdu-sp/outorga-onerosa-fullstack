'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function NovoCard({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'rounded-xl border border-border/70 bg-card shadow-xs',
				className,
			)}>
			{children}
		</div>
	);
}

export function NovoCardHead({
	icon: Icon,
	title,
	subtitle,
	extra,
}: {
	icon: LucideIcon;
	title: string;
	subtitle?: ReactNode;
	extra?: ReactNode;
}) {
	return (
		<div className="flex items-center gap-3 border-b border-border px-5 py-4">
			<div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
				<Icon className="size-[18px]" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="text-[15px] font-bold">{title}</div>
				{subtitle && (
					<div className="mt-px text-[12.5px] text-muted-foreground">{subtitle}</div>
				)}
			</div>
			{extra}
		</div>
	);
}

export function CampoKV({
	label,
	value,
	full,
	highlight,
	mono,
}: {
	label: string;
	value?: string | number | null;
	full?: boolean;
	highlight?: boolean;
	mono?: boolean;
}) {
	const empty = value == null || value === '';
	return (
		<div className={cn('flex min-w-0 flex-col gap-[5px]', full && 'col-span-2')}>
			<span className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted-foreground">
				{label}
			</span>
			<span
				className={cn(
					'rounded-lg border border-border bg-secondary px-[11px] py-[9px] text-sm font-medium',
					empty && 'text-muted-foreground',
					highlight && !empty && 'border-primary/20 bg-primary-soft font-bold text-primary',
					mono && 'font-mono',
				)}>
				{empty ? '—' : value}
			</span>
		</div>
	);
}

export function ChipExemplo({
	children,
	onClick,
}: {
	children: ReactNode;
	onClick?: () => void;
}) {
	const className =
		'rounded-full border border-border bg-card px-3 py-[5px] font-mono text-xs text-foreground';
	if (!onClick) {
		return <span className={className}>{children}</span>;
	}
	return (
		<button type="button" onClick={onClick} className={cn(className, 'hover:border-primary/40')}>
			{children}
		</button>
	);
}
