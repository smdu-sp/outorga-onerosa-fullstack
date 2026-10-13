/** @format */

import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
import { PageHeader, PageShell } from '@/components/page-shell';
import { Calculator, ChevronLeft, FileDown, FileText, Send, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import FormNovoProcessoTecnico from './_components/form-novo-processo-tecnico';

export const metadata = {
	title: 'Novo Processo — Outorga Onerosa',
};

const PASSOS: { icon: LucideIcon; titulo: string; descricao: string }[] = [
	{
		icon: FileText,
		titulo: 'Informe o processo',
		descricao: 'Digite o número do processo SEI.',
	},
	{
		icon: Calculator,
		titulo: 'Preencha o memorial',
		descricao: 'Mesmo motor de cálculo da planilha oficial.',
	},
	{
		icon: FileDown,
		titulo: 'Confira e baixe o PDF',
		descricao: 'Verifique o resultado e anexe o memorial ao processo SEI.',
	},
	{
		icon: Send,
		titulo: 'Envie à CAP',
		descricao: 'Somente após anexar o memorial ao SEI.',
	},
];

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

			<section className="mb-6 rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-xs">
				<ol className="m-0 grid list-none grid-cols-1 p-0 lg:grid-cols-4">
					{PASSOS.map(({ icon: Icon, titulo, descricao }, i) => (
						<li
							key={titulo}
							className="relative flex gap-3 pb-5 last:pb-0 lg:flex-col lg:items-center lg:gap-3 lg:pb-0 lg:text-center">
							{i < PASSOS.length - 1 && (
								<span
									aria-hidden
									className="absolute left-[17px] top-10 h-[calc(100%-2.5rem)] w-px bg-border lg:left-[calc(50%+1.375rem)] lg:top-[17px] lg:h-px lg:w-[calc(100%-2.75rem)]"
								/>
							)}
							<div className="relative grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-4 ring-card">
								<Icon className="size-[18px]" />
								<span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
									{i + 1}
								</span>
							</div>
							<div className="min-w-0">
								<p className="m-0 text-sm font-semibold text-foreground">{titulo}</p>
								<p className="m-0 mt-0.5 text-xs leading-relaxed text-muted-foreground">
									{descricao}
								</p>
							</div>
						</li>
					))}
				</ol>
			</section>

			<Suspense>
				<FormNovoProcessoTecnico />
			</Suspense>
		</PageShell>
	);
}
