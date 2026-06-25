'use client';

import { IRelatorio } from '@/types/relatorio';
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

const fmtM = (v: number | null) =>
	v == null ? '—' : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;

const CORES_HIST = [
	'rgba(148,163,184,0.5)',
	'rgba(100,130,185,0.6)',
	'rgba(60,100,175,0.7)',
	'rgba(30,60,140,0.75)',
];

export function ComparativoAnual({ d }: { d: IRelatorio | null }) {
	const anoAtual = d?.anoAtual ?? new Date().getFullYear();
	const meses = d?.meses ?? [];
	const anos = [anoAtual - 4, anoAtual - 3, anoAtual - 2, anoAtual - 1];

	const data = meses.map((mes, i) => {
		const entry: Record<string, string | number | null> = { mes };
		for (const ano of anos) {
			entry[String(ano)] = d?.hist[ano]?.[i] ?? null;
		}
		entry[`${anoAtual} (parcial)`] = d?.d26.real[i] ?? null;
		return entry;
	});

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<BarChart2 className="h-4 w-4 text-muted-foreground" />
				Comparativo Ano a Ano ({anoAtual - 4}–{anoAtual})
			</div>
			<ResponsiveContainer width="100%" height={260}>
				<BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
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
						tickFormatter={(v) => `R$${v}M`}
						domain={['auto', 'auto']}
					/>
					<Tooltip
						formatter={(val) => [fmtM(val as number), '']}
						contentStyle={{
							fontSize: 12,
							borderRadius: 8,
							border: '1px solid var(--border)',
							background: 'var(--card)',
						}}
					/>
					<Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconSize={9} />
					{anos.map((ano, i) => (
						<Bar
							key={ano}
							dataKey={String(ano)}
							fill={CORES_HIST[i]}
							radius={3}
						/>
					))}
					<Bar
						dataKey={`${anoAtual} (parcial)`}
						fill="rgba(59,130,246,0.85)"
						radius={3}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
