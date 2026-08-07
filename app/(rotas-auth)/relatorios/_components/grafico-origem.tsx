'use client';

import { IRelatorio } from '@/types/relatorio';
import { Building2 } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const CORES: Record<string, string> = {
	'SEI/SISACOE': '#1e3a7a',
	PORTAL: '#0d9488',
	'APROVA DIGITAL': '#7c3aed',
	Outros: '#94a3b8',
};

export function GraficoOrigemSistema({ d }: { d: IRelatorio | null }) {
	const data = (d?.origemSistema ?? [])
		.filter((x) => x.qtdProcessos > 0)
		.map((x) => ({
			name: x.sistema,
			value: x.qtdProcessos,
			valor: x.valorArrecadado,
		}));

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<Building2 className="h-4 w-4 text-muted-foreground" />
				Processos por sistema de origem
			</div>
			{data.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período</p>
			) : (
				<>
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
								{data.map((item) => (
									<Cell
										key={item.name}
										fill={CORES[item.name] ?? '#94a3b8'}
										stroke="#fff"
										strokeWidth={2}
									/>
								))}
							</Pie>
							<Tooltip
								formatter={(val, _name, item) => {
									const payload = item?.payload as { valor?: number } | undefined;
									return [
										`${val as number} processos · ${fmtBrl(payload?.valor ?? 0)}`,
										'',
									];
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
							<div key={item.name} className="flex items-center gap-2 text-xs">
								<span
									className="h-2.5 w-2.5 shrink-0 rounded-sm"
									style={{ background: CORES[item.name] ?? '#94a3b8' }}
								/>
								<span className="flex-1 text-muted-foreground">{item.name}</span>
								<span className="font-mono font-semibold">{item.value}</span>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}
