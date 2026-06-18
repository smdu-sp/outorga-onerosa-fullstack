/** @format */

'use client';

import { IPermissao } from '@/types/permissao';
import { ColumnDef } from '@tanstack/react-table';
import ModalUpdateCreate from './modal-update-create';
import ModalDelete from './modal-delete';

export const columns: ColumnDef<IPermissao>[] = [
	{
		accessorKey: 'nome',
		header: 'Nome',
	},
	{
		accessorKey: 'permissao',
		header: 'Permissão',
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
							permissao={row.original}
							isUpdating={true}
						/>
						<ModalDelete id={row.original.id} />
					</div>
				);
			},
		},
];
