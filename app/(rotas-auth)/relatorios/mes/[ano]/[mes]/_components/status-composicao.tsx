'use client';

import { IRelatorioMesDetalhe } from '@/types/relatorio';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

const STATUS_CONFIG = {
	pagoPrazo: { label: 'Pago no prazo', color: '#16a34a' },
	pagoAtraso: { label: 'Pago com atraso', color: '#d97706' },
	aberto: { label: 'Em aberto', color: '#3b82f6' },
	quebra: { label: 'Quebra', color: '#dc2626' },
} as const;

export function StatusComposicao({ d }: { d: IRelatorioMesDetalhe }) {
	const { countStatus } = d;
	const data = (
		[
			{ key: 'pagoPrazo', value: countStatus.pagoPrazo },
			{ key: 'pagoAtraso', value: countStatus.pagoAtraso },
			{ key: 'aberto', value: countStatus.aberto },
			{ key: 'quebra', value: countStatus.quebra },
		] as const
	).filter((s) => s.value > 0);

	const total = data.reduce((s, d) => s + d.value, 0);

	if (total === 0) {
		return (
			<div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card p-5 shadow-xs">
				<span className="text-sm text-muted-foreground">Sem dados</span>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-1 flex items-center gap-2">
				<span className="text-sm font-semibold">Adimplência Contratual</span>
				<UiTooltip>
					<TooltipTrigger asChild>
						<Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
					</TooltipTrigger>
					<TooltipContent side="bottom" className="max-w-[260px] text-center leading-relaxed">
						Situação contratual das parcelas com vencimento neste mês. Uma parcela pode estar "paga no prazo" mesmo que o dinheiro tenha entrado no caixa de um mês anterior (antecipação) — por isso este percentual pode ser maior que o "% do previsto realizado".
					</TooltipContent>
				</UiTooltip>
			</div>
			<p className="mb-3 text-[11px] text-muted-foreground">
				Parcelas com vencimento neste mês
			</p>
			<ResponsiveContainer width="100%" height={180}>
				<PieChart>
					<Pie
						data={data}
						dataKey="value"
						nameKey="key"
						cx="50%"
						cy="50%"
						innerRadius={48}
						outerRadius={72}
						paddingAngle={2}
					>
						{data.map((entry) => (
							<Cell key={entry.key} fill={STATUS_CONFIG[entry.key].color} />
						))}
					</Pie>
					<Tooltip
						formatter={(val, key) => [
							`${val} (${(((val as number) / total) * 100).toFixed(0)}%)`,
							STATUS_CONFIG[key as keyof typeof STATUS_CONFIG]?.label ?? key,
						]}
						contentStyle={{
							fontSize: 12,
							borderRadius: 8,
							border: '1px solid var(--border)',
							background: 'var(--card)',
						}}
					/>
					<Legend
						formatter={(key) => STATUS_CONFIG[key as keyof typeof STATUS_CONFIG]?.label ?? key}
						wrapperStyle={{ fontSize: 11 }}
						iconSize={10}
					/>
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
}
