'use client';

import { IRelatorio } from '@/types/relatorio';
import { Map } from 'lucide-react';
import Link from 'next/link';

const fmtM = (v: number) =>
	`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;

export function CardMapaDistritos({ d }: { d: IRelatorio | null }) {
	const distritos = d?.distritos ?? [];
	const total = distritos.reduce((s, x) => s + x.val, 0);
	const top3 = distritos.slice(0, 3);

	return (
		<Link
			href="/relatorios/mapa-distritos"
			className="group block rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5">
			<div className="mb-4 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<Map className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
					Arrecadação por Distrito
				</div>
				<span className="text-xs text-muted-foreground group-hover:text-primary">Ver mapa →</span>
			</div>

			{distritos.length === 0 ? (
				<p className="text-sm text-muted-foreground">Sem dados de distrito disponíveis.</p>
			) : (
				<>
					<div className="mb-4">
						<div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
							Total arrecadado
						</div>
						<div className="text-2xl font-bold tracking-tight text-primary">{fmtM(total)}</div>
						<div className="mt-1 text-xs text-muted-foreground">
							{distritos.length} distritos com recebimentos
						</div>
					</div>

					<div className="flex flex-col gap-2 border-t border-border pt-3">
						{top3.map((dist, i) => (
							<div key={dist.chave} className="flex items-center justify-between gap-3 text-sm">
								<span className="min-w-0 truncate text-muted-foreground">
									<span className="mr-1.5 font-mono text-[10px] text-foreground/50">{i + 1}º</span>
									{dist.nome}
								</span>
								<span className="shrink-0 font-mono text-xs font-semibold">{fmtM(dist.val)}</span>
							</div>
						))}
					</div>
				</>
			)}
		</Link>
	);
}
