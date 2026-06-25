/** @format */

import { ChevronRight, House } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { consultarEnquadramento } from '../actions';
import FormCriarProcesso from './_components/form-criar-processo';
import { TableSkeleton } from '@/components/data-table';

export const metadata = { title: 'Criar Processo — Outorga Onerosa' };

export default async function CriarProcessoPage({
	searchParams,
}: {
	searchParams: Promise<{ modo?: string; id?: string }>;
}) {
	const { modo = 'SQL', id = '' } = await searchParams;

	// Re-fetch enquadramento server-side so the form is pre-populated
	const enquadramento =
		id
			? await consultarEnquadramento(modo as 'SQL' | 'PROCESSO', id)
			: { ok: false as const, error: 'Identificador não informado.' };

	return (
		<div className="w-full max-w-3xl pb-8">
			{/* Breadcrumb */}
			<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
				<Link href="/" className="hover:text-foreground transition-colors">
					<House className="h-3.5 w-3.5" /><span className="sr-only">Início</span>
				</Link>
				<ChevronRight className="h-3.5 w-3.5 opacity-50" />
				<Link href="/processos" className="hover:text-foreground transition-colors">Processos</Link>
				<ChevronRight className="h-3.5 w-3.5 opacity-50" />
				<Link href="/processos/novo" className="hover:text-foreground transition-colors">Novo processo</Link>
				<ChevronRight className="h-3.5 w-3.5 opacity-50" />
				<span className="text-foreground font-medium">Confirmar criação</span>
			</nav>

			<div className="mb-6">
				<h1 className="text-3xl font-bold tracking-tight">Confirmar criação</h1>
				<p className="text-muted-foreground mt-1.5 text-sm max-w-xl leading-relaxed">
					Revise o enquadramento e preencha os dados finais do processo.
				</p>
			</div>

			<Suspense fallback={<TableSkeleton />}>
				<FormCriarProcesso
					identificador={id}
					modo={modo as 'SQL' | 'PROCESSO'}
					enquadramento={enquadramento.ok ? enquadramento.data : undefined}
					enquadramentoErro={enquadramento.ok ? undefined : enquadramento.error}
				/>
			</Suspense>
		</div>
	);
}
