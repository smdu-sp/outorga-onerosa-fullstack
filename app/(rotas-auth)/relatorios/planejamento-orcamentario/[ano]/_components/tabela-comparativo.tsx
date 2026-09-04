/** @format */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/app/utils/funcoes-utilitarias';
import { IComparativoPlanejamentoExecutado } from '@/types/planejamento-orcamentario';

export function TabelaComparativo({ comparativo }: { comparativo: IComparativoPlanejamentoExecutado }) {
	return (
		<div className="rounded-lg border overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/50 hover:bg-muted/50">
						<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mês</TableHead>
						<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planejado</TableHead>
						<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Executado</TableHead>
						<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variação</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{comparativo.meses.map((m) => {
						const variacao = m.executado - m.planejado;
						const percentual = m.planejado > 0 ? (variacao / m.planejado) * 100 : 0;
						return (
							<TableRow key={m.mes}>
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
