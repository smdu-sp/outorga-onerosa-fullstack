/** @format */

import { notFound } from 'next/navigation';
import { Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { buscarComparativo, listarAnos } from '@/services/planejamento-orcamentario';
import { IComparativoPlanejamentoExecutado } from '@/types/planejamento-orcamentario';
import { formatCurrency } from '@/app/utils/funcoes-utilitarias';
import { SeletorAno } from './_components/seletor-ano';
import { GraficoComparativo } from './_components/grafico-comparativo';
import { TabelaComparativo } from './_components/tabela-comparativo';

export const dynamic = 'force-dynamic';

export default async function PlanejamentoOrcamentarioRelatorioPage({
	params,
}: {
	params: Promise<{ ano: string }>;
}) {
	const { ano: anoParam } = await params;
	const ano = Number(anoParam);
	if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) notFound();

	const [respComparativo, respAnos] = await Promise.all([buscarComparativo(ano), listarAnos()]);
	const comparativo = respComparativo.ok
		? (respComparativo.data as IComparativoPlanejamentoExecutado | null)
		: null;
	const anosDisponiveis = respAnos.ok && Array.isArray(respAnos.data) ? (respAnos.data as number[]) : [];

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-5 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 text-[28px] font-bold tracking-tight">
						<Target className="h-6 w-6 text-primary" />
						Planejamento × Executado
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Comparativo entre o orçamento planejado e a arrecadação real — {ano}
					</p>
				</div>
				<SeletorAno ano={ano} anosDisponiveis={anosDisponiveis} />
			</div>

			{!comparativo ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
					<Target className="mb-3 h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-medium text-muted-foreground">
						Nenhum planejamento cadastrado para {ano}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Um administrador precisa gerar o planejamento deste ano em Planejamento Orçamentário.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-6">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<KpiCard
							icon={<Wallet className="h-3.5 w-3.5" />}
							label="Planejado (ano)"
							value={formatCurrency(comparativo.total_planejado)}
						/>
						<KpiCard
							icon={
								comparativo.total_executado >= comparativo.total_planejado ? (
									<TrendingUp className="h-3.5 w-3.5" />
								) : (
									<TrendingDown className="h-3.5 w-3.5" />
								)
							}
							label="Executado até o momento"
							value={formatCurrency(comparativo.total_executado)}
							sub={`${comparativo.percentual_executado.toFixed(1)}% do planejado`}
							color={
								comparativo.percentual_executado >= 95
									? 'green'
									: comparativo.percentual_executado >= 80
										? 'amber'
										: 'red'
							}
						/>
						<KpiCard
							icon={<Wallet className="h-3.5 w-3.5" />}
							label="Saldo (planejado − executado)"
							value={formatCurrency(comparativo.saldo)}
						/>
					</div>

					<GraficoComparativo comparativo={comparativo} />
					<TabelaComparativo comparativo={comparativo} />
				</div>
			)}
		</div>
	);
}

function KpiCard({
	icon,
	label,
	value,
	sub,
	color,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	sub?: string;
	color?: 'green' | 'amber' | 'red';
}) {
	return (
		<div className="rounded-xl border border-border bg-card px-5 py-4 shadow-xs">
			<div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
				{icon}
				{label}
			</div>
			<div
				className={`text-[22px] font-bold tracking-tight ${
					color === 'green'
						? 'text-green-700 dark:text-green-400'
						: color === 'amber'
							? 'text-amber-600'
							: color === 'red'
								? 'text-red-600'
								: 'text-foreground'
				}`}>
				{value}
			</div>
			{sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
		</div>
	);
}
