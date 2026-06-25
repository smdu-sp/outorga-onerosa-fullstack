'use client';

import { IRelatorio } from '@/types/relatorio';
import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';

const fmtM = (v: number | null) =>
	v == null ? 'sem dado' : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;

export function HeatmapArrecadacao({ d }: { d: IRelatorio | null }) {
	const [tip, setTip] = useState<{ ano: number; mes: string; val: number | null; x: number; y: number } | null>(null);

	const anoAtual = d?.anoAtual ?? new Date().getFullYear();
	const meses = d?.meses ?? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
	const anos = [anoAtual - 4, anoAtual - 3, anoAtual - 2, anoAtual - 1, anoAtual];

	const allVals = anos.flatMap((ano) => {
		const row = ano === anoAtual ? d?.d26.real : d?.hist[ano];
		return (row ?? []).filter((v) => v != null) as number[];
	});
	const maxV = Math.max(...allVals, 1);

	function cellColor(val: number | null) {
		if (val == null) return 'var(--muted)';
		const t = Math.min(val / maxV, 1);
		return `rgba(30,58,122,${(0.07 + t * 0.87).toFixed(2)})`;
	}
	function textFill(val: number | null) {
		return val != null && val / maxV > 0.52 ? '#fff' : '#1e3a7a';
	}

	const CW = 46, CH = 26, G = 2, PL = 48, PT = 22;
	const W = PL + (CW + G) * 12 + 4;
	const H = PT + (CH + G) * anos.length + 12;

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<LayoutGrid className="h-4 w-4 text-muted-foreground" />
				Heatmap — Arrecadação Mensal (R$ M)
			</div>
			<div className="overflow-x-auto">
				<svg
					width={W}
					height={H}
					style={{ display: 'block' }}
					onMouseLeave={() => setTip(null)}>
					{meses.map((m, i) => (
						<text
							key={m}
							x={PL + (CW + G) * i + CW / 2}
							y={16}
							textAnchor="middle"
							fontSize={9.5}
							fill="var(--muted-foreground)"
							fontFamily="system-ui,sans-serif">
							{m}
						</text>
					))}
					{anos.map((ano, ri) => {
						const row = ano === anoAtual ? d?.d26.real : d?.hist[ano];
						const cy = PT + (CH + G) * ri;
						return (
							<g key={ano}>
								<text
									x={PL - 7}
									y={cy + CH / 2 + 4}
									textAnchor="end"
									fontSize={10}
									fill="var(--muted-foreground)"
									fontFamily="system-ui,sans-serif">
									{ano}
								</text>
								{meses.map((_, ci) => {
									const val = row?.[ci] ?? null;
									const cx = PL + (CW + G) * ci;
									return (
										<g
											key={ci}
											onMouseEnter={(e) =>
												setTip({ ano, mes: meses[ci], val, x: e.clientX, y: e.clientY })
											}
											style={{ cursor: 'default' }}>
											<rect
												x={cx}
												y={cy}
												width={CW}
												height={CH}
												rx={4}
												fill={cellColor(val)}
											/>
											{val != null && (
												<text
													x={cx + CW / 2}
													y={cy + CH / 2 + 3.5}
													textAnchor="middle"
													fontSize={9}
													fill={textFill(val)}
													fontWeight="600"
													fontFamily="'JetBrains Mono',monospace">
													{val.toFixed(0)}
												</text>
											)}
										</g>
									);
								})}
							</g>
						);
					})}
				</svg>
			</div>
			{tip && (
				<div
					className="pointer-events-none fixed z-50 rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg"
					style={{ left: tip.x + 12, top: tip.y - 34 }}>
					{tip.mes}/{tip.ano}: {fmtM(tip.val)}
				</div>
			)}
		</div>
	);
}
