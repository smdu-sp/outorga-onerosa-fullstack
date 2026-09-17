/** @format */

import DataTable from '@/components/data-table';
import Pagination from '@/components/pagination';
import { PageHeader, PageShell } from '@/components/page-shell';
import { AdminListaSkeleton } from '@/components/skeleton-blocks';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth/auth';
import * as gruposPermissao from '@/services/grupos-permissao';
import {
	IGrupoPermissao,
	IPaginadoGrupoPermissao,
} from '@/types/grupo-permissao';
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
			<Permissoes searchParams={searchParams} />
		</Suspense>
	);
}

async function Permissoes({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	let { pagina = 1, limite = 10, total = 0 } = await searchParams;
	let ok = false;
	const { busca = '' } = await searchParams;
	let dados: IGrupoPermissao[] = [];
	const session = await auth();
	if (session?.usuario) {
		const response = await gruposPermissao.buscarTudo(
			+pagina,
			+limite,
			busca as string,
		);
		const { data } = response;
		ok = response.ok;
		if (ok) {
			if (data) {
				const paginado = data as IPaginadoGrupoPermissao;
				pagina = paginado.pagina || 1;
				limite = paginado.limite || 10;
				total = paginado.total || 0;
				dados = paginado.data || [];
			}
			const paginado = data as IPaginadoGrupoPermissao;
			dados = paginado.data || [];
		}
	}

	return (
		<PageShell>
			<PageHeader
				title='Grupos de Permissão'
				actions={
					<ModalUpdateAndCreate
						isUpdating={false}
						trigger={
							<Button className='gap-2'>
								<Plus className='size-4' />
								Novo grupo
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
