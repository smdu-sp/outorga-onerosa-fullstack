/** @format */

import DataTable from '@/components/data-table';
import Pagination from '@/components/pagination';
import { PageHeader, PageShell } from '@/components/page-shell';
import { AdminListaSkeleton } from '@/components/skeleton-blocks';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth/auth';
import * as usuario from '@/services/usuario';
import { IPaginadoUsuario, IUsuario } from '@/types/usuario';
import { Plus } from 'lucide-react';
import { Suspense } from 'react';
import { columns } from './_components/columns';
import ModalUpdateAndCreate from './_components/modal-update-create';

export default function UsuariosSuspense({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	return (
		<Suspense fallback={<AdminListaSkeleton />}>
			<Usuarios searchParams={searchParams} />
		</Suspense>
	);
}

async function Usuarios({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	let { pagina = 1, limite = 10, total = 0 } = await searchParams;
	let ok = false;
	const { busca = '' } = await searchParams;
	let dados: IUsuario[] = [];
	const session = await auth();
	if (session?.usuario) {
		const response = await usuario.buscarTudo(
			+pagina,
			+limite,
			busca as string,
		);
		const { data } = response;
		ok = response.ok;
		if (ok) {
			if (data) {
				const paginado = data as IPaginadoUsuario;
				pagina = paginado.pagina || 1;
				limite = paginado.limite || 10;
				total = paginado.total || 0;
				dados = paginado.data || [];
			}
			const paginado = data as IPaginadoUsuario;
			dados = paginado.data || [];
		}
	}

	return (
		<PageShell>
			<PageHeader
				title='Usuários'
				actions={
					<ModalUpdateAndCreate
						isUpdating={false}
						trigger={
							<Button className='gap-2'>
								<Plus className='size-4' />
								Novo usuário
							</Button>
						}
					/>
				}
			/>
			<div className='flex flex-col gap-6'>
				{dados && <DataTable columns={columns} data={dados || []} />}
				{dados && dados.length > 0 && (
					<Pagination total={+total} limite={+limite} pagina={+pagina} />
				)}
			</div>
		</PageShell>
	);
}
