/** @format */

import { FormularioCardsSkeleton } from '@/components/skeleton-blocks';
import { PageHeader, PageShell } from '@/components/page-shell';
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
	const { modo = 'PROCESSO', id = '' } = await searchParams;

	const enquadramento = id
		? await consultarEnquadramento(modo as 'SQL' | 'PROCESSO', id)
		: { ok: false as const, error: 'Identificador não informado.' };

	return (
		<PageShell className="pb-20">
			<PageHeader
				title="Confirmar criação"
				breadcrumb={
					<nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
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
				}
			/>

			<Suspense fallback={<FormularioCardsSkeleton />}>
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
		</PageShell>
	);
}
