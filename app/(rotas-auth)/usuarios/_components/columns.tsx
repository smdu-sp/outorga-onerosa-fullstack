/** @format */

'use client';

import { IUsuario } from '@/types/usuario';
import { ColumnDef } from '@tanstack/react-table';
import ModalUpdateCreate from './modal-update-create';
import ModalDelete from './modal-delete';

export const columns: ColumnDef<IUsuario>[] = [
	{
		accessorKey: 'nome',
		header: 'Nome',
	},
	{
		accessorKey: 'login',
		header: 'Usuário',
	},
	{
		accessorKey: 'email',
		header: 'E-mail',
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
						user={row.original}
						isUpdating={true}
					/>
					<ModalDelete status={!row.original.status} id={row.original.id} />
				</div>
			);
		},
	},
];
