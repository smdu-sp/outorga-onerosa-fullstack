/** @format */

import { notFound } from 'next/navigation';
import { Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader, PageShell, StatGroup } from '@/components/page-shell';
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
		<PageShell>
			<PageHeader
				icon={Target}
				title="Planejamento × Executado"
				actions={<SeletorAno ano={ano} anosDisponiveis={anosDisponiveis} />}>
				<span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
					Orçamento planejado × arrecadação real — {ano}
				</span>
			</PageHeader>

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
					<StatGroup>
						<div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
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
					</StatGroup>

					<GraficoComparativo comparativo={comparativo} />
					<TabelaComparativo comparativo={comparativo} />
				</div>
			)}
		</PageShell>
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
		<div className="bg-card px-5 py-4">
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
