'use client';

import { IRelatorioMesDetalhe } from '@/types/relatorio';
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

const fmtBrl = (v: number) =>
	'R$ ' + (v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M';

export function GraficoSemanas({ d }: { d: IRelatorioMesDetalhe }) {
	const data = d.semanas.map((s) => ({
		semana: `Dias ${s.label}`,
		Previsto: +(s.previsto / 1_000_000).toFixed(2),
		Realizado: +(s.realizado / 1_000_000).toFixed(2),
	}));

	if (data.length === 0) {
		return (
			<div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card p-5 shadow-xs">
				<span className="text-sm text-muted-foreground">Sem dados de distribuição semanal</span>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<BarChart2 className="h-4 w-4 text-muted-foreground" />
				Distribuição por Semana
			</div>
			<ResponsiveContainer width="100%" height={220}>
				<BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
					<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
					<XAxis
						dataKey="semana"
						tickLine={false}
						axisLine={false}
						tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
						tickFormatter={(v) => `R$${v}M`}
						domain={['auto', 'auto']}
					/>
					<Tooltip
						formatter={(val) => [fmtBrl((val as number) * 1_000_000), '']}
						contentStyle={{
							fontSize: 12,
							borderRadius: 8,
							border: '1px solid var(--border)',
							background: 'var(--card)',
						}}
					/>
					<Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconSize={10} />
					<Bar dataKey="Previsto" fill="rgba(148,163,184,0.45)" radius={3} />
					<Bar dataKey="Realizado" fill="rgba(59,130,246,0.82)" radius={3} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
