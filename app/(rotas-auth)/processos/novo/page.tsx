/** @format */

import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
import { PageHeader, PageShell } from '@/components/page-shell';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import FormNovoProcessoTecnico from './_components/form-novo-processo-tecnico';

export const metadata = {
	title: 'Novo Processo — Outorga Onerosa',
};

export default async function NovoProcessoPage() {
	const session = await requireAuth();
	const userId = session.usuario.sub;
	const [podeGeosampa, podeCriar] = await Promise.all([
		usuarioPermitido(userId, 'processos_criar_geosampa'),
		usuarioPermitido(userId, 'processos_criar'),
	]);

	if (!podeGeosampa && !podeCriar) redirect('/processos');

	return (
		<PageShell className="pb-20">
			<PageHeader
				title="Novo processo"
				breadcrumb={
					<Link
						href="/processos"
						className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
						<ChevronLeft className="h-4 w-4" />
						Processos
						<span className="mx-1 opacity-40">/</span>
						<span className="text-foreground">Novo processo</span>
					</Link>
				}
			/>
				<p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
					Informe o número do processo e preencha o memorial de cálculo (mesmo motor da
					planilha oficial) — você confere o resultado, baixa o memorial em PDF para o
					processo SEI e só então envia à CAP.
				</p>

			<Suspense>
				<FormNovoProcessoTecnico />
			</Suspense>
		</PageShell>
	);
}
