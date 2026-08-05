import Link from 'next/link';
import { AlertTriangle, CalendarClock, ClipboardList, Sparkles } from 'lucide-react';
import type { IPainelOperacional } from '@/types/processo';

const fmt = new Intl.NumberFormat('pt-BR');

type AlertaItem = {
	href: string;
	label: string;
	hint: string;
	value: number;
	icone: typeof AlertTriangle;
	tom: 'danger' | 'warn' | 'info' | 'muted';
};

const TOM: Record<AlertaItem['tom'], string> = {
	danger: 'bg-destructive/10 text-destructive',
	warn: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
	info: 'bg-primary/10 text-primary',
	muted: 'bg-muted text-muted-foreground',
};

export function PainelAlertasKpi({
	contagens,
}: {
	contagens: IPainelOperacional['contagens'];
}) {
	const itens: AlertaItem[] = [
		{
			href: '/processos?status=EM_PAGAMENTO',
			label: 'Parcelas vencidas',
			hint: 'Não quitadas e sem quebra',
			value: contagens.parcelasVencidas,
			icone: AlertTriangle,
			tom: contagens.parcelasVencidas > 0 ? 'danger' : 'muted',
		},
		{
			href: '/processos?vencimento=MES',
			label: 'A vencer em 30 dias',
			hint: 'Parcelas em aberto no horizonte',
			value: contagens.parcelasAVencer30d,
			icone: CalendarClock,
			tom: contagens.parcelasAVencer30d > 0 ? 'warn' : 'muted',
		},
		{
			href: '/processos?novo=SIM',
			label: 'Processos novos',
			hint: 'Portal sem parcelas cadastradas',
			value: contagens.processosNovos,
			icone: Sparkles,
			tom: contagens.processosNovos > 0 ? 'info' : 'muted',
		},
		{
			href: '/processos?pendencia=TODAS',
			label: 'Pendências críticas',
			hint: 'Distrito, subprefeitura ou parcelas',
			value: contagens.pendenciasCriticas,
			icone: ClipboardList,
			tom: contagens.pendenciasCriticas > 0 ? 'danger' : 'muted',
		},
	];

	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{itens.map((item) => {
				const Icon = item.icone;
				return (
					<Link
						key={item.label}
						href={item.href}
						className="rounded-xl border border-border/70 bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
									{item.label}
								</p>
								<p className="mt-1 text-2xl font-semibold tracking-tight">
									{fmt.format(item.value)}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
							</div>
							<div
								className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TOM[item.tom]}`}>
								<Icon className="h-4 w-4" />
							</div>
						</div>
					</Link>
				);
			})}
		</div>
	);
}
