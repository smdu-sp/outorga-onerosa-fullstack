'use client';

import { IRelatorioMesDetalhe, IRelatorioMesRegiao } from '@/types/relatorio';
import { Building2, MapPin } from 'lucide-react';

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function PainelRegiao({
	titulo,
	icone,
	itens,
}: {
	titulo: string;
	icone: React.ReactNode;
	itens: IRelatorioMesRegiao[];
}) {
	const total = itens.reduce((s, i) => s + i.valBrl, 0);
	const maxVal = itens[0]?.valBrl ?? 1;

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm font-semibold">
					{icone}
					{titulo}
				</div>
				{itens.length > 0 && (
					<div className="text-xs text-muted-foreground">
						<span className="font-semibold text-foreground">{fmtBrl(total)}</span> no mês
					</div>
				)}
			</div>

			{itens.length === 0 ? (
				<p className="py-4 text-sm text-muted-foreground">
					Nenhuma arrecadação registrada no mês.
				</p>
			) : (
				<div className="flex flex-col gap-2.5">
					{itens.map((i) => (
						<div key={i.nome} className="flex items-center gap-3">
							<span
								className="w-28 min-w-0 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px]"
								title={i.nome}>
								{i.nome}
							</span>
							<div className="flex-1">
								<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary transition-all"
										style={{ width: `${(i.valBrl / maxVal) * 100}%` }}
									/>
								</div>
							</div>
							<span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
								{i.proc}
							</span>
							<span className="w-24 shrink-0 text-right font-mono text-[11px] font-semibold text-muted-foreground tabular-nums">
								{fmtBrl(i.valBrl)}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export function ArrecadacaoPorRegiao({ d }: { d: IRelatorioMesDetalhe }) {
	return (
		<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
			<PainelRegiao
				titulo="Arrecadação por subprefeitura"
				icone={<MapPin className="h-4 w-4 text-muted-foreground" />}
				itens={d.subprefeituras}
			/>
			<PainelRegiao
				titulo="Arrecadação por distrito"
				icone={<Building2 className="h-4 w-4 text-muted-foreground" />}
				itens={d.distritos}
			/>
		</div>
	);
}
