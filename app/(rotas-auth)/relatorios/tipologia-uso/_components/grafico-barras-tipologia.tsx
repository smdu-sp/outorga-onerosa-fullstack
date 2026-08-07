'use client';

import type { IRelatorioTipologia } from '@/types/relatorio';
import { BarChart3 } from 'lucide-react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

const fmtM = (v: number) =>
	`R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;

export function GraficoTipologiaBarras({ d }: { d: IRelatorioTipologia }) {
	const data = d.linhas.map((l) => ({
		name: l.label,
		arrecadado: +(l.valorArrecadado / 1_000_000).toFixed(2),
		emAberto: +(l.valorEmAberto / 1_000_000).toFixed(2),
		quebra: +(l.valorQuebra / 1_000_000).toFixed(2),
	}));

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<BarChart3 className="h-4 w-4 text-muted-foreground" />
				Valores por tipologia (R$ milhões)
			</div>
			<ResponsiveContainer width="100%" height={220}>
				<BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} />
					<YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => String(v)} />
					<Tooltip
						formatter={(val, name) => [fmtM((val as number) * 1_000_000), String(name)]}
						contentStyle={{
							fontSize: 12,
							borderRadius: 8,
							border: '1px solid var(--border)',
							background: 'var(--card)',
						}}
					/>
					<Bar dataKey="arrecadado" name="Arrecadado" fill="#1e3a7a" radius={[4, 4, 0, 0]} />
					<Bar dataKey="emAberto" name="Em aberto" fill="#f59e0b" radius={[4, 4, 0, 0]} />
					<Bar dataKey="quebra" name="Quebra" fill="#ef4444" radius={[4, 4, 0, 0]} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
