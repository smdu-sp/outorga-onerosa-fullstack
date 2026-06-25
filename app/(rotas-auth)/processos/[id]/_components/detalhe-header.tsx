'use client';

import { STATUS_PAGAMENTO } from '@/app/(rotas-auth)/_components/processo-detalhe-labels';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { ChevronLeft, Download, Keyboard, Search } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { BotaoGeoSampa } from './botao-geosampa';

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

import { formatarDataCivil } from '@/lib/datas';

const STATUS_CLASS: Record<string, string> = {
	EM_PAGAMENTO: 'bg-warning-soft text-[oklch(0.5_0.13_70)]',
	QUITADO: 'bg-success-soft text-success',
	QUEBRA: 'bg-destructive/12 text-destructive',
};

const TIPO_CLASS: Record<string, string> = {
	PDE: 'bg-primary-soft text-primary',
	COTA: 'bg-orange-50 text-orange-700',
};

function parseValorMonetario(valor?: string | null): number {
	if (!valor?.trim()) return 0;
	const normalizado = valor
		.replace(/[^\d,.-]/g, '')
		.replace(/\.(?=\d{3}(?:\D|$))/g, '')
		.replace(',', '.');
	const n = Number.parseFloat(normalizado);
	return Number.isFinite(n) ? n : 0;
}

export function calcularMetricas(processo: IProcessoDetalhe) {
	const parcelas = processo.parcelas ?? [];
	const valorTotal = parcelas.reduce((s, p) => s + (p.valor ?? 0), 0);
	let valorDevido = 0;
	const valorPlanilha = processo.monitoramento_cota?.valor_devido;
	if (valorPlanilha) {
		valorDevido = parseValorMonetario(valorPlanilha);
	} else if (processo.status_pagamento !== 'QUITADO') {
		valorDevido = parcelas
			.filter((p) => !p.status_quitacao)
			.reduce((s, p) => s + p.valor, 0);
	}
	return { valorTotal, valorDevido };
}

export function DetalheHeader({
	processo,
	busca,
	onBusca,
	onDetalheAtualizado,
}: {
	processo: IProcessoDetalhe;
	busca: string;
	onBusca: (v: string) => void;
	onDetalheAtualizado?: (detalhe: IProcessoDetalhe) => void;
}) {
	const buscaRef = useRef<HTMLInputElement>(null);
	const { valorTotal, valorDevido } = calcularMetricas(processo);
	const status = processo.status_pagamento ?? '';
	const tipo = processo.tipo ?? '';

	return (
		<div className="mb-5 space-y-4">
			<Link
				href="/processos"
				className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
				<ChevronLeft className="h-4 w-4" />
				Processos
				<span className="mx-1 opacity-40">/</span>
				<span className="font-mono text-xs text-foreground">{processo.num_processo}</span>
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0 space-y-3">
					<div className="flex flex-wrap items-center gap-2.5">
						<h1 className="m-0 font-mono text-[26px] font-bold tracking-[-0.01em]">
							{processo.num_processo}
						</h1>
						{tipo && (
							<span
								className={cn(
									'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
									TIPO_CLASS[tipo] ?? 'bg-secondary text-muted-foreground',
								)}>
								{tipo}
							</span>
						)}
						{status && (
							<span
								className={cn(
									'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
									STATUS_CLASS[status] ?? 'bg-secondary text-muted-foreground',
								)}>
								{STATUS_PAGAMENTO[status] ?? status}
							</span>
						)}
					</div>

					<div className="flex flex-wrap gap-6">
						<Metrica label="Valor total" value={fmtBRL(valorTotal)} />
						<Metrica
							label="Valor devido"
							value={fmtBRL(valorDevido)}
							destaque={valorDevido > 0}
						/>
						<Metrica label="Data de entrada" value={formatarDataCivil(processo.data_entrada)} />
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
				<p className="flex items-center gap-2 text-xs text-muted-foreground">
					<span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
					Alterações salvas automaticamente
				</p>

				<div className="flex flex-wrap items-center gap-2">
					{onDetalheAtualizado && (
						<BotaoGeoSampa
							processoId={processo.id}
							numProcesso={processo.num_processo}
							onAtualizado={onDetalheAtualizado}
						/>
					)}
					<div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-2.5 py-1.5">
						<Search className="h-3.5 w-3.5 text-muted-foreground" />
						<input
							ref={buscaRef}
							data-detalhe-busca
							value={busca}
							onChange={(e) => onBusca(e.target.value)}
							placeholder="Buscar campo…  ( / )"
							className="w-44 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-52"
						/>
					</div>
					<button
						type="button"
						title="Atalhos de teclado"
						className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground">
						<Keyboard className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => window.print()}
						className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
						<Download className="h-4 w-4" />
						Exportar
					</button>
				</div>
			</div>
		</div>
	);
}

function Metrica({
	label,
	value,
	destaque,
}: {
	label: string;
	value: string;
	destaque?: boolean;
}) {
	return (
		<div>
			<p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
				{label}
			</p>
			<p
				className={cn(
					'mt-0.5 text-base font-semibold tabular-nums',
					destaque && 'text-[oklch(0.5_0.13_70)]',
				)}>
				{value}
			</p>
		</div>
	);
}
