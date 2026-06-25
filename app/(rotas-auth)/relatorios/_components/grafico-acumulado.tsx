'use client';

import { IRelatorio } from '@/types/relatorio';
import { TrendingUp } from 'lucide-react';
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

const fmtM = (v: number | null) =>
	v == null ? '—' : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}M`;

export function GraficoAcumulado({ d }: { d: IRelatorio | null }) {
	const meses = d?.meses ?? [];
	const mesAtual = d?.mesAtual ?? new Date().getMonth();
	const anoAtual = d?.anoAtual ?? new Date().getFullYear();
	const metaAnual = d?.metaAnual ?? 0;

	// Build cumulative 2026 real
	let cumReal = 0;
	const realCum: (number | null)[] = [];
	for (let i = 0; i < 12; i++) {
		const v = d?.d26.real[i];
		if (v != null) { cumReal += v; realCum.push(+cumReal.toFixed(1)); }
		else realCum.push(null);
	}

	// Build projection from current month onwards
	let base = realCum.filter((v) => v != null).slice(-1)[0] ?? 0;
	const projCum: (number | null)[] = [];
	for (let i = 0; i < 12; i++) {
		if (i < mesAtual) { projCum.push(null); }
		else if (i === mesAtual) { projCum.push(realCum[i]); base = realCum[i] ?? base; }
		else {
			const pv = d?.d26.prev[i] ?? 0;
			base += pv * 0.97;
			projCum.push(+base.toFixed(1));
		}
	}

	// Build hist year cumulative (previous year for comparison)
	const anoAnterior = anoAtual - 1;
	const histAnterior = d?.hist[anoAnterior];
	let cumHist = 0;
	const histCum = histAnterior
		? histAnterior.map((v) => { cumHist += v; return +cumHist.toFixed(1); })
		: Array(12).fill(null);

	const keyRealizado = `${anoAtual} Realizado`;
	const keyProjecao = `${anoAtual} Projeção`;

	const data = meses.map((mes, i) => ({
		mes,
		[`${anoAnterior}`]: histCum[i] ?? null,
		[keyRealizado]: realCum[i],
		[keyProjecao]: projCum[i],
	}));

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<TrendingUp className="h-4 w-4 text-muted-foreground" />
				Acumulado + Projeção de Fechamento
			</div>
			<ResponsiveContainer width="100%" height={240}>
				<LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
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
					<Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconSize={10} />
					{metaAnual > 0 && (
						<ReferenceLine
							y={metaAnual}
							stroke="rgba(220,38,38,0.45)"
							strokeDasharray="3 3"
							label={{ value: 'Meta', position: 'right', fontSize: 10, fill: '#dc2626' }}
						/>
					)}
					<Line
						type="monotone"
						dataKey={String(anoAnterior)}
						stroke="rgba(148,163,184,0.8)"
						strokeWidth={1.5}
						dot={false}
						connectNulls
					/>
					<Line
						type="monotone"
						dataKey={keyRealizado}
						stroke="#1e3a7a"
						strokeWidth={2.5}
						dot={{ r: 3 }}
						connectNulls
					/>
					<Line
						type="monotone"
						dataKey={keyProjecao}
						stroke="#3b82f6"
						strokeWidth={2}
						strokeDasharray="5 4"
						dot={{ r: 2 }}
						connectNulls
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
