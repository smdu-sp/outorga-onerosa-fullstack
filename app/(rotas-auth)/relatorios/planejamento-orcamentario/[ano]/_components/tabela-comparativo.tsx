/** @format */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/app/utils/funcoes-utilitarias';
import { IComparativoPlanejamentoExecutado } from '@/types/planejamento-orcamentario';

export function TabelaComparativo({ comparativo }: { comparativo: IComparativoPlanejamentoExecutado }) {
	return (
		<div className="overflow-hidden rounded-xl border border-border/70 shadow-xs">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Mês</TableHead>
						<TableHead>Planejado</TableHead>
						<TableHead>Executado</TableHead>
						<TableHead>Variação</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{comparativo.meses.map((m) => {
						const variacao = m.executado - m.planejado;
						const percentual = m.planejado > 0 ? (variacao / m.planejado) * 100 : 0;
						return (
							<TableRow key={m.mes} className="hover:bg-primary-soft">
								<TableCell className="font-medium">{m.nome_mes}</TableCell>
								<TableCell>{formatCurrency(m.planejado)}</TableCell>
								<TableCell>{formatCurrency(m.executado)}</TableCell>
								<TableCell className={variacao >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}>
									{variacao >= 0 ? '+' : ''}
									{formatCurrency(variacao)} ({percentual >= 0 ? '+' : ''}
									{percentual.toFixed(1)}%)
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
