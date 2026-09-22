import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { garantirAcessoProcesso, requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { listarMemoriaisCotaDoProcesso, serializarMemorialCotaResumo } from '@/lib/server/cota-memorial';
import { FormCalculoCota } from './_components/form-calculo-cota';

export default async function CalculoCotaPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await requireAuth();

	const processo = await prisma.processo.findUnique({
		where: { id },
		select: { id: true, num_processo: true, criado_por: true, status_pagamento: true },
	});
	if (!processo) notFound();
	await garantirAcessoProcesso(session.usuario.sub, processo);

	const memoriais = await listarMemoriaisCotaDoProcesso(id);
	const historico = memoriais.map(serializarMemorialCotaResumo);

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<Link
				href={`/processos/${processo.id}`}
				className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
				<ChevronLeft className="h-4 w-4" />
				{processo.num_processo}
			</Link>
			<h1 className="mb-1 text-xl font-bold">Cálculo da Cota de Solidariedade</h1>
			<p className="mb-5 text-sm text-muted-foreground">
				Porta do memorial de cálculo da planilha oficial (art. 112 da Lei 16.050/2014 e Decreto
				56.538/2015) — preenchimento manual. Confira os campos e salve para manter o histórico de
				cálculos deste processo.
			</p>
			<FormCalculoCota processoId={processo.id} historicoInicial={historico} />
		</div>
	);
}
