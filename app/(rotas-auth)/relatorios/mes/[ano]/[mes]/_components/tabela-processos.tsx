'use client';

import { IRelatorioMesProcesso } from '@/types/relatorio';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_LABEL: Record<IRelatorioMesProcesso['status'], string> = {
	pago_prazo: 'Pago no prazo',
	pago_atraso: 'Pago com atraso',
	aberto: 'Em aberto',
	quebra: 'Quebra',
};

const STATUS_CLASS: Record<IRelatorioMesProcesso['status'], string> = {
	pago_prazo: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
	pago_atraso: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	aberto: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
	quebra: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

type FiltroStatus = 'todos' | IRelatorioMesProcesso['status'];

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtData = (iso: string) => {
	const [y, m, d] = iso.split('-');
	return `${d}/${m}/${y}`;
};

const PAGE_SIZE = 20;

export function TabelaProcessosMes({ processos }: { processos: IRelatorioMesProcesso[] }) {
	const [filtro, setFiltro] = useState<FiltroStatus>('todos');
	const [pagina, setPagina] = useState(1);

	const filtrados = filtro === 'todos' ? processos : processos.filter((p) => p.status === filtro);
	const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
	const paginaAtual = Math.min(pagina, totalPaginas);
	const inicio = (paginaAtual - 1) * PAGE_SIZE;
	const visiveis = filtrados.slice(inicio, inicio + PAGE_SIZE);

	function mudarFiltro(novoFiltro: FiltroStatus) {
		setFiltro(novoFiltro);
		setPagina(1);
	}

	const totais: Record<FiltroStatus, number> = {
		todos: processos.length,
		pago_prazo: processos.filter((p) => p.status === 'pago_prazo').length,
		pago_atraso: processos.filter((p) => p.status === 'pago_atraso').length,
		aberto: processos.filter((p) => p.status === 'aberto').length,
		quebra: processos.filter((p) => p.status === 'quebra').length,
	};

	return (
		<div className="rounded-xl border border-border bg-card shadow-xs">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
				<div className="text-sm font-semibold">Contratos com vencimento no mês</div>
				<div className="flex flex-wrap gap-2">
					{(['todos', 'pago_prazo', 'pago_atraso', 'aberto', 'quebra'] as FiltroStatus[]).map(
						(s) => (
							<button
								key={s}
								onClick={() => mudarFiltro(s)}
								className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
									filtro === s
										? 'border-foreground bg-foreground text-background'
										: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
								}`}>
								{s === 'todos' ? 'Todos' : STATUS_LABEL[s]} ({totais[s]})
							</button>
						),
					)}
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border text-xs text-muted-foreground">
							<th className="px-5 py-3 text-left font-medium">Processo</th>
							<th className="px-4 py-3 text-left font-medium">Interessado</th>
							<th className="px-4 py-3 text-left font-medium">Tipo</th>
							<th className="px-4 py-3 text-right font-medium">Valor previsto</th>
							<th className="px-4 py-3 text-left font-medium">Vencimento</th>
							<th className="px-4 py-3 text-left font-medium">Quitação</th>
							<th className="px-4 py-3 text-left font-medium">Status</th>
						</tr>
					</thead>
					<tbody>
						{visiveis.length === 0 && (
							<tr>
								<td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
									Nenhum contrato encontrado
								</td>
							</tr>
						)}
						{visiveis.map((p) => (
							<tr
								key={p.id}
								className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
								<td className="px-5 py-3">
									<Link
										href={`/processos/${p.id}`}
										className="font-medium text-blue-600 hover:underline dark:text-blue-400">
										{p.num}
									</Link>
								</td>
								<td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">
									{p.interessado}
								</td>
								<td className="px-4 py-3">
									<span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
										{p.tipo}
									</span>
								</td>
								<td className="px-4 py-3 text-right font-medium tabular-nums">
									{fmtBrl(p.valor)}
								</td>
								<td className="px-4 py-3 text-muted-foreground tabular-nums">
									{fmtData(p.vencimento)}
								</td>
								<td className="px-4 py-3 text-muted-foreground tabular-nums">
									{p.quitacao ? fmtData(p.quitacao) : '—'}
								</td>
								<td className="px-4 py-3">
									<span
										className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[p.status]}`}>
										{STATUS_LABEL[p.status]}
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="flex items-center justify-between border-t border-border px-5 py-3">
				<div className="text-xs text-muted-foreground">
					{filtrados.length > 0 ? (
						<>
							{inicio + 1}–{Math.min(inicio + PAGE_SIZE, filtrados.length)} de {filtrados.length} contrato{filtrados.length !== 1 ? 's' : ''}{' '}
							· <span className="font-semibold text-foreground">{fmtBrl(filtrados.reduce((s, p) => s + p.valor, 0))}</span> total
						</>
					) : (
						'Nenhum contrato'
					)}
				</div>

				{totalPaginas > 1 && (
					<div className="flex items-center gap-1">
						<button
							onClick={() => setPagina((p) => Math.max(1, p - 1))}
							disabled={paginaAtual === 1}
							className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">
							<ChevronLeft className="h-3.5 w-3.5" />
						</button>

						{Array.from({ length: totalPaginas }, (_, i) => i + 1)
							.filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 1)
							.reduce<(number | '...')[]>((acc, p, i, arr) => {
								if (i > 0 && (arr[i - 1] as number) < p - 1) acc.push('...');
								acc.push(p);
								return acc;
							}, [])
							.map((item, i) =>
								item === '...' ? (
									<span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
								) : (
									<button
										key={item}
										onClick={() => setPagina(item as number)}
										className={`flex h-7 min-w-[28px] items-center justify-center rounded border px-1.5 text-xs font-medium transition-colors ${
											paginaAtual === item
												? 'border-foreground bg-foreground text-background'
												: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
										}`}>
										{item}
									</button>
								),
							)}

						<button
							onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
							disabled={paginaAtual === totalPaginas}
							className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">
							<ChevronRight className="h-3.5 w-3.5" />
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
