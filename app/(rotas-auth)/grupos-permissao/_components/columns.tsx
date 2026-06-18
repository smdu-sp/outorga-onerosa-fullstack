/** @format */

'use client';

import { ColumnDef } from '@tanstack/react-table';
import ModalUpdateCreate from './modal-update-create';
import ModalDelete from './modal-delete';
import { IGrupoPermissao } from '@/types/grupo-permissao';

export const columns: ColumnDef<IGrupoPermissao>[] = [
	{
		accessorKey: 'nome',
		header: 'Nome',
	},
	{
		accessorKey: 'permissoes',
		header: () => 'Permissões cadastradas',
		cell: ({ row }) => { return `${row.original.permissoes?.length || 0}` },
	},
	{
		accessorKey: 'actions',
		header: () => <p></p>,
		cell: ({ row }) => {
			return (
				<div
					className='flex gap-2 items-center justify-end'
					key={row.id}>
					<ModalUpdateCreate
						grupoPermissao={row.original}
						isUpdating={true}
					/>
					<ModalDelete id={row.original.id} />
				</div>
			);
		},
	},
];
