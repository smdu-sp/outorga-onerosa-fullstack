'use client';

import { IRelatorio } from '@/types/relatorio';
import { MapPin } from 'lucide-react';

const fmtM = (v: number) =>
	`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;

export function RankingSubprefeituras({ d }: { d: IRelatorio | null }) {
	const subs = d?.subs ?? [];
	const maxVal = subs[0]?.val ?? 1;

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<MapPin className="h-4 w-4 text-muted-foreground" />
				Por Subprefeitura
			</div>
			{subs.length === 0 ? (
				<p className="text-sm text-muted-foreground">Sem dados de subprefeitura disponíveis.</p>
			) : (
				<div className="flex flex-col gap-2">
					{subs.map((s) => (
						<div key={s.nome} className="flex items-center gap-3">
							<span className="w-24 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px]">
								{s.nome}
							</span>
							<div className="flex-1">
								<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary transition-all"
										style={{ width: `${(s.val / maxVal) * 100}%` }}
									/>
								</div>
							</div>
							<span className="w-20 text-right font-mono text-[11px] font-semibold text-muted-foreground">
								{fmtM(s.val)}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
