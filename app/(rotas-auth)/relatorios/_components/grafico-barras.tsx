'use client';

import { IRelatorio } from '@/types/relatorio';
import { BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

function barColor(real: number | null, prev: number | null, isAtual: boolean) {
	if (real == null) return 'rgba(0,0,0,0)';
	if (isAtual) return 'rgba(59,130,246,0.82)';
	if (!prev) return '#94a3b8';
	const r = real / prev;
	return r >= 0.95 ? 'rgba(22,163,74,0.82)' : r >= 0.8 ? 'rgba(217,119,6,0.82)' : 'rgba(220,38,38,0.82)';
}

export function GraficoPrevistoRealizado({ d }: { d: IRelatorio | null }) {
	const router = useRouter();
	const meses = d?.meses ?? [];
	const mesAtual = d?.mesAtual ?? new Date().getMonth();
	const anoAtual = d?.anoAtual ?? new Date().getFullYear();

	const data = meses.map((mes, i) => ({
		mes,
		idx: i,
		Previsto: d?.d26.prev[i] ?? null,
		Realizado: d?.d26.real[i] ?? null,
		color: barColor(d?.d26.real[i] ?? null, d?.d26.prev[i] ?? null, i === mesAtual),
	}));

	const handleClick = (payload: { activePayload?: { payload?: { idx?: number } }[] } | null) => {
		const idx = payload?.activePayload?.[0]?.payload?.idx;
		if (idx == null) return;
		if (idx > mesAtual) return;
		router.push(`/relatorios/mes/${anoAtual}/${idx + 1}`);
	};

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<BarChart2 className="h-4 w-4 text-muted-foreground" />
				Previsto vs Realizado por Mês
				<span className="ml-1 text-[11px] font-normal text-muted-foreground">
					— clique em um mês para ver o detalhe
				</span>
			</div>
			<ResponsiveContainer width="100%" height={240}>
				<BarChart
					data={data}
					margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
					onClick={handleClick}
					style={{ cursor: 'pointer' }}>
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
					<Legend
						wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
						iconSize={10}
					/>
					<Bar dataKey="Previsto" fill="rgba(148,163,184,0.4)" radius={3} />
					<Bar dataKey="Realizado" radius={3} fill="#3b82f6" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
