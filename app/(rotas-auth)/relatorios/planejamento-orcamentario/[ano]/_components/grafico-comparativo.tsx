/** @format */

'use client';

import { BarChart2 } from 'lucide-react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { formatCurrency } from '@/app/utils/funcoes-utilitarias';
import { IComparativoPlanejamentoExecutado } from '@/types/planejamento-orcamentario';

export function GraficoComparativo({ comparativo }: { comparativo: IComparativoPlanejamentoExecutado }) {
	const data = comparativo.meses.map((m) => ({
		mes: m.nome_mes.slice(0, 3),
		Planejado: m.planejado,
		Executado: m.executado,
	}));

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<BarChart2 className="h-4 w-4 text-muted-foreground" />
				Planejado × Executado por mês
			</div>
			<ResponsiveContainer width="100%" height={280}>
				<BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
					<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
					<XAxis
						dataKey="mes"
						tickLine={false}
						axisLine={false}
						tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
						tickFormatter={(v) => formatCurrency(v).replace(/,\d+$/, '')}
						width={90}
					/>
					<Tooltip
						formatter={(val) => [formatCurrency(val as number), '']}
						contentStyle={{
							fontSize: 12,
							borderRadius: 8,
							border: '1px solid var(--border)',
							background: 'var(--card)',
						}}
					/>
					<Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconSize={10} />
					<Bar dataKey="Planejado" fill="rgba(148,163,184,0.5)" radius={3} />
					<Bar dataKey="Executado" fill="#3b82f6" radius={3} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
