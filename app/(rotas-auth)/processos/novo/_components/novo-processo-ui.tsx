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
				'rounded-[var(--radius)] border border-border bg-card',
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
		<div className="flex items-center gap-3 border-b border-border px-[22px] py-[18px]">
			<div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-primary-soft text-primary">
				<Icon className="h-[18px] w-[18px]" />
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

export function SegControl<T extends string>({
	options,
	value,
	onChange,
	disabled,
}: {
	options: { value: T; label: string; icon: LucideIcon }[];
	value: T;
	onChange: (v: T) => void;
	disabled?: boolean;
}) {
	return (
		<div
			role="tablist"
			className="inline-flex gap-[3px] rounded-[9px] border border-border bg-secondary p-[3px]">
			{options.map((opt) => {
				const Icon = opt.icon;
				return (
					<button
						key={opt.value}
						type="button"
						role="tab"
						disabled={disabled}
						aria-selected={value === opt.value}
						onClick={() => onChange(opt.value)}
						className={cn(
							'inline-flex items-center gap-[7px] rounded-[7px] border-none bg-transparent px-4 py-[7px] text-[13px] font-medium text-muted-foreground transition-colors',
							'hover:text-foreground disabled:opacity-50',
							value === opt.value &&
								'bg-card font-semibold text-primary shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
						)}>
						<Icon className="h-[15px] w-[15px]" />
						{opt.label}
					</button>
				);
			})}
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
