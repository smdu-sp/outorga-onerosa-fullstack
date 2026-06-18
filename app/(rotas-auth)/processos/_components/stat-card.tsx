import { cn } from '@/lib/utils';
import { Check, Clock, Layers, TrendingDown, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
	layers: Layers,
	clock: Clock,
	check: Check,
	trendingDown: TrendingDown,
};

const COLORS: Record<string, string> = {
	blue: 'bg-primary-soft text-primary',
	amber: 'bg-warning-soft text-[oklch(0.5_0.13_70)]',
	green: 'bg-success-soft text-success',
	red: 'bg-destructive/12 text-destructive',
};

export function StatCard({
	icon,
	color,
	label,
	value,
	sub,
}: {
	icon: keyof typeof ICONS;
	color: keyof typeof COLORS;
	label: string;
	value: string | number;
	sub?: string;
}) {
	const Icon = ICONS[icon];

	return (
		<div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-card px-[18px] py-[15px]">
			<div className="flex items-center gap-2">
				<div
					className={cn(
						'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg',
						COLORS[color],
					)}>
					<Icon className="h-4 w-4" />
				</div>
				<span className="text-[11.5px] font-medium uppercase tracking-[0.03em] text-muted-foreground">
					{label}
				</span>
			</div>
			<div className="text-[23px] font-bold tracking-[-0.01em] tabular-nums">{value}</div>
			{sub && <div className="text-xs text-muted-foreground">{sub}</div>}
		</div>
	);
}
