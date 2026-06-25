'use client';

import { IRelatorio } from '@/types/relatorio';
import { PieChart as PieIcon } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const fmtM = (v: number, d = 0) =>
	`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}M`;

const CORES = ['#1e3a7a', '#7c3aed', '#f59e0b', '#e2e8f0'];

export function GraficoComposicao({ d }: { d: IRelatorio | null }) {
	const totalReal = d?.d26.real.filter((v) => v != null).reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0;
	const totalAntec = d?.d26.antec.filter((v) => v != null).reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0;
	const totalQuebras = d?.d26.quebras.filter((v) => v != null).reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0;
	const normal = Math.max(totalReal - totalAntec, 0);
	const aReceber = Math.max((d?.metaAnual ?? 0) - totalReal - totalQuebras, 0);

	const data = [
		{ name: 'Pgtos. regulares', value: +normal.toFixed(1) },
		{ name: 'Antecipações', value: +totalAntec.toFixed(1) },
		{ name: 'Quebras (perdas)', value: +totalQuebras.toFixed(1) },
		{ name: 'A receber', value: +aReceber.toFixed(1) },
	].filter((d) => d.value > 0);

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<PieIcon className="h-4 w-4 text-muted-foreground" />
				Composição da Carteira {d?.anoAtual ?? new Date().getFullYear()}
			</div>
			<ResponsiveContainer width="100%" height={200}>
				<PieChart>
					<Pie
						data={data}
						cx="50%"
						cy="50%"
						innerRadius={55}
						outerRadius={80}
						paddingAngle={2}
						dataKey="value">
						{data.map((_, i) => (
							<Cell key={i} fill={CORES[i % CORES.length]} stroke="#fff" strokeWidth={2} />
						))}
					</Pie>
					<Tooltip
						formatter={(val) => [fmtM(val as number), '']}
						contentStyle={{
							fontSize: 12,
							borderRadius: 8,
							border: '1px solid var(--border)',
							background: 'var(--card)',
						}}
					/>
				</PieChart>
			</ResponsiveContainer>
			<div className="mt-2 flex flex-col gap-1.5">
				{data.map((item, i) => (
					<div key={item.name} className="flex items-center gap-2 text-xs">
						<span
							className="h-2.5 w-2.5 shrink-0 rounded-sm"
							style={{ background: CORES[i % CORES.length] }}
						/>
						<span className="flex-1 text-muted-foreground">{item.name}</span>
						<span className="font-mono font-semibold">{fmtM(item.value)}</span>
					</div>
				))}
			</div>
		</div>
	);
}
