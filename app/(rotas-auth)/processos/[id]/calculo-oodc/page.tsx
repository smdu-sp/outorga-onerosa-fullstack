import { Calculator, ChevronLeft, Info } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireDev } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { PageHeader, PageShell } from '@/components/page-shell';
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
		<PageShell max="wide">
			<PageHeader
				icon={Calculator}
				title="Cálculo da OODC"
				badge={
					<span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
						DEV
					</span>
				}
				breadcrumb={
					<Link
						href={`/processos/${processo.id}`}
						className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
						<ChevronLeft className="h-4 w-4" />
						{processo.num_processo}
					</Link>
				}
			/>

			<div className="mb-5 flex items-start gap-2.5 rounded-lg border border-border bg-secondary px-4 py-3 text-[13px] text-muted-foreground">
				<Info className="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					Preenchimento automático — os campos já localizados no GeoSampa/BI vêm marcados{' '}
					<span className="mx-0.5 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
						auto
					</span>{' '}
					e podem ser sobrescritos. O restante é manual.
				</p>
			</div>

			<FormCalculoOodcAutomatico processoId={processo.id} rascunho={rascunho} historicoInicial={historico} />
		</PageShell>
	);
}
