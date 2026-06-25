/** @format */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IProcesso } from '@/types/processo';
import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import ModalProcessos from './modal-processos';

const TIPO_VARIANT: Record<string, string> = {
	PDE: 'bg-primary/8 text-primary border-primary/20 hover:bg-primary/12',
	COTA: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900',
};

export const columns: ColumnDef<IProcesso>[] = [
	{
		accessorKey: 'num_processo',
		header: 'Número do Processo',
		cell: ({ row }) => (
			<span className="font-mono text-sm tabular-nums font-medium">
				{row.original.num_processo}
			</span>
		),
	},
	{
		accessorKey: 'tipo',
		header: 'Tipo',
		cell: ({ row }) => {
			const tipo = row.original.tipo ?? '—';
			const extra = TIPO_VARIANT[tipo] ?? 'bg-muted text-muted-foreground border-border';
			return (
				<Badge variant="outline" className={extra}>
					{tipo}
				</Badge>
			);
		},
	},
	{
		accessorKey: 'cpf_cnpj',
		header: 'CPF / CNPJ',
		cell: ({ row }) => (
			<span className="font-mono text-sm tabular-nums text-muted-foreground">
				{(row.original as IProcesso & { cpf_cnpj?: string }).cpf_cnpj ?? '—'}
			</span>
		),
	},
	{
		accessorKey: 'parcelas',
		header: 'Parcelas',
		cell: ({ row }) => {
			const count =
				row.original.parcelas?.length ?? row.original.total_parcelas ?? 0;
			return <span className="tabular-nums">{count}</span>;
		},
	},
	{
		accessorKey: 'protocolo_ad',
		header: 'Protocolo',
		cell: ({ row }) => (
			<span className="text-muted-foreground text-sm">
				{row.original.protocolo_ad || '—'}
			</span>
		),
	},
	{
		id: 'actions',
		header: () => <span className="sr-only">Ações</span>,
		cell: ({ row }) => (
			<div className="flex items-center gap-1 justify-end">
				<ModalProcessos processo={row.original} key={row.original.id} />
				<Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
					<Link href={`/processos/${row.original.id}`} aria-label="Ver processo">
						<Eye className="h-4 w-4" />
					</Link>
				</Button>
			</div>
		),
	},
];
