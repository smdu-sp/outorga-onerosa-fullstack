'use client';

import { IRelatorioMesDetalhe } from '@/types/relatorio';
import { TrendingUp, TrendingDown, Ban, Zap, Minus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPct = (v: number) => v.toFixed(1) + '%';

export function KpiMes({ d }: { d: IRelatorioMesDetalhe }) {
	const diferenca = d.realizado - d.previsto;
	const pctAtingimento = d.previsto > 0 ? (d.realizado / d.previsto) * 100 : 0;
	const isPositivo = diferenca >= 0;

	const cards = [
		{
			label: 'Previsto no mês',
			valor: fmtBrl(d.previsto),
			sub: `${d.countStatus.pagoPrazo + d.countStatus.pagoAtraso + d.countStatus.aberto + d.countStatus.quebra} parcelas`,
			icon: <Minus className="h-4 w-4 text-muted-foreground" />,
			cor: 'text-foreground',
			tooltip: 'Soma dos valores de todas as parcelas com vencimento neste mês.',
		},
		{
			label: 'Realizado no mês',
			valor: fmtBrl(d.realizado),
			sub: `${fmtPct(pctAtingimento)} do previsto`,
			icon: <TrendingUp className="h-4 w-4 text-green-600" />,
			cor: 'text-green-700 dark:text-green-400',
			tooltip:
				'Caixa efetivamente recebido neste mês (pela data de quitação), independente do vencimento. Inclui antecipações de parcelas futuras, mas não conta pagamentos de parcelas deste mês feitos em meses anteriores.',
		},
		{
			label: 'Diferença',
			valor: (isPositivo ? '+' : '') + fmtBrl(diferenca),
			sub: isPositivo ? 'acima do previsto' : 'abaixo do previsto',
			icon: isPositivo
				? <TrendingUp className="h-4 w-4 text-green-600" />
				: <TrendingDown className="h-4 w-4 text-red-500" />,
			cor: isPositivo ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400',
			tooltip: 'Diferença entre o caixa realizado neste mês e o total previsto pelos vencimentos. Valor negativo é esperado quando há muitas antecipações: o dinheiro entrou antes.',
		},
		{
			label: 'Quebras no mês',
			valor: fmtBrl(d.quebras),
			sub: `${d.countStatus.quebra} contrato${d.countStatus.quebra !== 1 ? 's' : ''}`,
			icon: <Ban className="h-4 w-4 text-amber-500" />,
			cor: d.quebras > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
			tooltip: 'Valor de parcelas deste mês cujos contratos estão em situação de quebra.',
		},
		{
			label: 'Antecipações',
			valor: fmtBrl(d.antecipacoes),
			sub: 'arrecadado antecipado',
			icon: <Zap className="h-4 w-4 text-blue-500" />,
			cor: 'text-blue-700 dark:text-blue-400',
			tooltip: 'Pagamentos recebidos neste mês de parcelas com vencimento em meses futuros. Aumenta o caixa do mês mas não impacta o "Previsto".',
		},
	];

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
			{cards.map((c) => (
				<div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-xs">
					<div className="mb-2 flex items-center gap-2">
						{c.icon}
						<span className="text-xs text-muted-foreground">{c.label}</span>
						<Tooltip>
							<TooltipTrigger asChild>
								<Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help ml-auto shrink-0" />
							</TooltipTrigger>
							<TooltipContent side="bottom" className="max-w-[240px] text-center leading-relaxed">
								{c.tooltip}
							</TooltipContent>
						</Tooltip>
					</div>
					<div className={`text-xl font-bold ${c.cor}`}>{c.valor}</div>
					<div className="mt-1 text-[11px] text-muted-foreground">{c.sub}</div>
				</div>
			))}
		</div>
	);
}
