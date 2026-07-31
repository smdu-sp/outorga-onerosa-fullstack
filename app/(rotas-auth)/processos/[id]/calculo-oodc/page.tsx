import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireDev } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { montarRascunhoCalculo, listarMemoriaisDoProcesso, serializarMemorialResumo } from '@/lib/server/oodc-memorial';
import { FormCalculoOodcAutomatico } from './_components/form-calculo-oodc-automatico';

export default async function CalculoOodcPage({ params }: { params: Promise<{ id: string }> }) {
	await requireDev();
	const { id } = await params;

	const processo = await prisma.processo.findUnique({
		where: { id },
		select: { id: true, num_processo: true },
	});
	if (!processo) notFound();

	const [rascunho, memoriais] = await Promise.all([
		montarRascunhoCalculo(id),
		listarMemoriaisDoProcesso(id),
	]);
	const historico = memoriais.map(serializarMemorialResumo);

	return (
		<div className="mx-auto max-w-5xl px-4 py-6">
			<Link
				href={`/processos/${processo.id}`}
				className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
				<ChevronLeft className="h-4 w-4" />
				{processo.num_processo}
			</Link>
			<h1 className="mb-1 text-xl font-bold">Cálculo da OODC</h1>
			<p className="mb-5 text-sm text-muted-foreground">
				Preenchimento automático (dev) — os campos já localizados no GeoSampa/BI vêm marcados
				<span className="mx-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
					auto
				</span>
				e podem ser sobrescritos. O restante é manual.
			</p>
			<FormCalculoOodcAutomatico processoId={processo.id} rascunho={rascunho} historicoInicial={historico} />
		</div>
	);
}
