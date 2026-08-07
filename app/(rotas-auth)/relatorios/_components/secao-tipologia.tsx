'use client';

import Link from 'next/link';
import { IRelatorio } from '@/types/relatorio';
import { Home } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const CORES: Record<string, string> = {
	R: '#1e3a7a',
	nR: '#f59e0b',
	'R/nR': '#7c3aed',
	SEM: '#94a3b8',
};

export function SecaoTipologiaUso({ d }: { d: IRelatorio | null }) {
	const linhas = d?.tipologiaUso?.linhas ?? [];
	const data = linhas.map((l) => ({
		name: l.label,
		codigo: l.codigo,
		value: l.qtdProcessos,
		valor: l.valorArrecadado,
	}));

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<Home className="h-4 w-4 text-muted-foreground" />
					Tipologia de uso (categoria)
				</div>
				<Link
					href="/relatorios/tipologia-uso"
					className="text-xs text-muted-foreground hover:text-primary">
					Ver relatório →
				</Link>
			</div>

			{data.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período</p>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<ResponsiveContainer width="100%" height={180}>
						<PieChart>
							<Pie
								data={data}
								cx="50%"
								cy="50%"
								innerRadius={45}
								outerRadius={70}
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
								formatter={(val, _name, item) => {
									const payload = item?.payload as { valor?: number } | undefined;
									return [
										`${val as number} · ${fmtBrl(payload?.valor ?? 0)}`,
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

					<div className="overflow-x-auto">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b border-border text-left text-muted-foreground">
									<th className="pb-2 font-medium">Tipologia</th>
									<th className="pb-2 text-right font-medium">Proc.</th>
									<th className="pb-2 text-right font-medium">Arrecadado</th>
								</tr>
							</thead>
							<tbody>
								{linhas.map((l) => (
									<tr key={l.codigo} className="border-b border-border/60">
										<td className="py-1.5">
											<span className="inline-flex items-center gap-1.5">
												<span
													className="h-2 w-2 rounded-sm"
													style={{ background: CORES[l.codigo] ?? '#94a3b8' }}
												/>
												{l.label}
											</span>
										</td>
										<td className="py-1.5 text-right font-mono">{l.qtdProcessos}</td>
										<td className="py-1.5 text-right font-mono">
											{fmtBrl(l.valorArrecadado)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
