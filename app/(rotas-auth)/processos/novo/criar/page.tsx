/** @format */

import { TableSkeleton } from '@/components/data-table';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { consultarEnquadramento } from '../actions';
import FormCriarProcesso from './_components/form-criar-processo';

export const metadata = { title: 'Criar Processo — Outorga Onerosa' };

export default async function CriarProcessoPage({
	searchParams,
}: {
	searchParams: Promise<{ modo?: string; id?: string }>;
}) {
	const { modo = 'SQL', id = '' } = await searchParams;

	const enquadramento = id
		? await consultarEnquadramento(modo as 'SQL' | 'PROCESSO', id)
		: { ok: false as const, error: 'Identificador não informado.' };

	return (
		<div className="mx-auto w-full max-w-[920px] px-4 py-[30px] pb-20 sm:px-8">
			<nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground">
				<Link
					href="/processos"
					className="inline-flex items-center gap-1 no-underline hover:text-foreground">
					<ChevronLeft className="h-4 w-4" />
					Processos
				</Link>
				<span className="mx-1.5 opacity-40">/</span>
				<Link href="/processos/novo" className="no-underline hover:text-foreground">
					Novo processo
				</Link>
				<span className="mx-1.5 opacity-40">/</span>
				<span className="text-foreground">Confirmar criação</span>
			</nav>

			<div className="mb-[22px]">
				<h1 className="m-0 text-[30px] font-bold tracking-[-0.01em]">Confirmar criação</h1>
				<p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
					Revise o enquadramento e preencha os dados finais do processo.
				</p>
			</div>

			<Suspense fallback={<TableSkeleton />}>
				<FormCriarProcesso
					identificador={id}
					modo={modo as 'SQL' | 'PROCESSO'}
					modoSalvamento={enquadramento.ok ? enquadramento.modoSalvamento : undefined}
					identificadorSalvamento={
						enquadramento.ok ? enquadramento.identificadorSalvamento : undefined
					}
					enquadramento={enquadramento.ok ? enquadramento.data : undefined}
					enquadramentoErro={enquadramento.ok ? undefined : enquadramento.error}
				/>
			</Suspense>
		</div>
	);
}
