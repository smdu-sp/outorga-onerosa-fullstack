'use client';

import type { IRelatorioTipologia } from '@/types/relatorio';
import { PieChart as PieIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const CORES: Record<string, string> = {
	R: '#1e3a7a',
	nR: '#f59e0b',
	'R/nR': '#7c3aed',
	SEM: '#94a3b8',
};

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function GraficoTipologiaPizza({ d }: { d: IRelatorioTipologia }) {
	const data = d.linhas.map((l) => ({
		name: l.label,
		codigo: l.codigo,
		value: l.qtdProcessos,
		valor: l.valorArrecadado,
	}));

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<PieIcon className="h-4 w-4 text-muted-foreground" />
				Distribuição por tipologia
			</div>
			<ResponsiveContainer width="100%" height={220}>
				<PieChart>
					<Pie
						data={data}
						cx="50%"
						cy="50%"
						innerRadius={55}
						outerRadius={85}
						paddingAngle={2}
						dataKey="value">
						{data.map((item) => (
							<Cell
								key={item.codigo}
								fill={CORES[item.codigo] ?? '#94a3b8'}
								stroke="#fff"
								strokeWidth={2}
							/>
						))}
					</Pie>
					<Tooltip
						formatter={(val, _n, item) => {
							const p = item?.payload as { valor?: number } | undefined;
							return [`${val as number} processos · ${fmtBrl(p?.valor ?? 0)}`, ''];
						}}
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
				{data.map((item) => (
					<div key={item.codigo} className="flex items-center gap-2 text-xs">
						<span
							className="h-2.5 w-2.5 shrink-0 rounded-sm"
							style={{ background: CORES[item.codigo] ?? '#94a3b8' }}
						/>
						<span className="flex-1 text-muted-foreground">{item.name}</span>
						<span className="font-mono font-semibold">{item.value}</span>
					</div>
				))}
			</div>
		</div>
	);
}
