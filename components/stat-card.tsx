import Link from 'next/link';
import {
	AlertTriangle,
	Check,
	Clock,
	FolderOpen,
	Layers,
	TrendingDown,
	TrendingUp,
	type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
	layers: Layers,
	clock: Clock,
	check: Check,
	trendingDown: TrendingDown,
	trendingUp: TrendingUp,
	folder: FolderOpen,
	alert: AlertTriangle,
} satisfies Record<string, LucideIcon>;

const COLORS: Record<string, string> = {
	blue: 'bg-primary-soft text-primary',
	amber: 'bg-warning-soft text-[oklch(0.5_0.13_70)]',
	green: 'bg-success-soft text-success',
	red: 'bg-destructive/12 text-destructive',
	slate: 'bg-muted text-muted-foreground',
};

export function StatCard({
	icon,
	color = 'slate',
	label,
	value,
	sub,
	href,
}: {
	icon?: keyof typeof ICONS;
	color?: keyof typeof COLORS;
	label: string;
	value: string | number;
	sub?: string;
	href?: string;
}) {
	const Icon = icon ? ICONS[icon] : null;

	const body = (
		<>
			<div className="flex items-center gap-2">
				{Icon && (
					<div
						className={cn(
							'grid size-[30px] shrink-0 place-items-center rounded-lg',
							COLORS[color],
						)}>
						<Icon className="size-4" />
					</div>
				)}
				<span className="text-[11.5px] font-medium uppercase tracking-[0.03em] text-muted-foreground">
					{label}
				</span>
			</div>
			<div className="text-[23px] font-bold tracking-[-0.01em] tabular-nums">{value}</div>
			{sub && <div className="text-xs text-muted-foreground">{sub}</div>}
		</>
	);

	const className = 'flex flex-col gap-1.5 bg-card px-[18px] py-[15px]';

	if (href) {
		return (
			<Link href={href} className={cn(className, 'transition-colors hover:bg-primary/5')}>
				{body}
			</Link>
		);
	}

	return <div className={className}>{body}</div>;
}
