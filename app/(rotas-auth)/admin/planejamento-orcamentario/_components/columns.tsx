/** @format */

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/app/utils/funcoes-utilitarias';
import { IPlanejamentoResumo } from '@/types/planejamento-orcamentario';

export const columns: ColumnDef<IPlanejamentoResumo>[] = [
	{
		accessorKey: 'ano',
		header: 'Ano',
		cell: ({ row }) => <span className="font-semibold">{row.original.ano}</span>,
	},
	{
		accessorKey: 'valor_anual',
		header: 'Valor anual planejado',
		cell: ({ row }) => formatCurrency(row.original.valor_anual),
	},
	{
		accessorKey: 'editavel',
		header: 'Prazo',
		cell: ({ row }) =>
			row.original.editavel ? (
				<Badge variant="success">Aberto para edição</Badge>
			) : (
				<Badge variant="secondary">Prazo encerrado</Badge>
			),
	},
	{
		accessorKey: 'alterado_em',
		header: 'Atualizado em',
		cell: ({ row }) => formatDate(new Date(row.original.alterado_em)),
	},
	{
		accessorKey: 'actions',
		header: () => <p></p>,
		cell: ({ row }) => (
			<div className="flex items-center justify-end">
				<Button asChild size="sm" variant="outline">
					<Link href={`/admin/planejamento-orcamentario/${row.original.ano}`}>
						Ver / editar
						<ArrowRight className="h-3.5 w-3.5" />
					</Link>
				</Button>
			</div>
		),
	},
];
