'use client';

import { cn } from '@/lib/utils';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { Calculator, Lock } from 'lucide-react';
import {
	badgeNav,
	contarPreenchidos,
	contarTotalCampos,
	filtrarNavPorBusca,
	NavDetalheGrupo,
	secaoPorId,
} from './detalhe-nav';

export function DetalheVnav({
	activeId,
	onSelect,
	detalhe,
	busca,
}: {
	activeId: string;
	onSelect: (id: string) => void;
	detalhe: IProcessoDetalhe;
	busca: string;
}) {
	const grupos: NavDetalheGrupo[] = filtrarNavPorBusca(busca);

	return (
		<nav className="flex w-full shrink-0 flex-col gap-4 lg:w-[220px]">
			{grupos.map((grupo) => (
				<div key={grupo.grupo}>
					<p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
						{grupo.grupo}
					</p>
					<div className="flex flex-col gap-0.5">
						{grupo.itens.map((item) => {
							const secao = secaoPorId(item.id);
							const count = secao ? badgeNav(secao, detalhe) : null;
							const active = activeId === item.id;

							return (
								<button
									key={item.id}
									type="button"
									onClick={() => onSelect(item.id)}
									className={cn(
										'relative flex w-full items-center gap-2.5 rounded-[9px] border border-transparent px-3 py-2 text-left text-[13.5px] text-foreground transition-colors',
										'hover:border-border hover:bg-card',
										active &&
											'border-border bg-card font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
									)}>
									{active && (
										<span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-sm bg-primary" />
									)}
									<span className="min-w-0 flex-1 truncate pl-1">{item.label}</span>
									{item.locked ? (
										<span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary px-1">
											<Lock className="h-3 w-3 text-muted-foreground" />
										</span>
									) : count != null ? (
										<span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary px-1.5 text-[10.5px] font-semibold text-muted-foreground">
											{count}
										</span>
									) : null}
								</button>
							);
						})}
					</div>
				</div>
			))}
		</nav>
	);
}

export function metaSecao(
	secaoId: string,
	detalhe: IProcessoDetalhe,
): { preenchidos: number; total: number } | null {
	const secao = secaoPorId(secaoId);
	if (!secao || secao.tipo !== 'grid') return null;
	return {
		preenchidos: contarPreenchidos(secao, detalhe),
		total: contarTotalCampos(secao),
	};
}

export function AvisoCalculo() {
	return (
		<div className="mb-4 flex items-center gap-2 rounded-[9px] border border-border bg-secondary px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
			<Calculator className="h-4 w-4 shrink-0 text-primary" />
			Campos calculados automaticamente a partir do enquadramento e dos parâmetros do lote.
		</div>
	);
}
