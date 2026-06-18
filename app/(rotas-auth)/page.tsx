/** @format */

import { TableSkeleton } from '@/components/data-table';
import { Suspense } from 'react';
import ValorRecebidoAno from './_components/graficos/valor-recebido-ano';
import Report from './_components/report';
import ValorRecebidoPorTipo from './_components/graficos/valor-recebido-por-tipo';
import ProcessosPorTipo from './_components/graficos/processos-por-tipo';
import ProgressaoSemestralProjetada from './_components/graficos/progressao-semestral-projetada';
import { dashboard } from '@/services/processos';
import { IDashboard } from '@/types/processo';

export default function HomeSuspense({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<Home searchParams={searchParams} />
		</Suspense>
	);
}

async function Home({
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { data, ok } = await dashboard();
	let relatorio: IDashboard | null = null;
	if (ok) {
		relatorio = data as IDashboard;
	}
	return (
		<div className='mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-5 md:px-6 md:py-6'>
			<div className='rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-xs'>
				<div className='flex flex-col gap-1'>
					<h1 className='text-[25px] font-semibold tracking-tight text-foreground'>Página inicial</h1>
					<p className='text-sm text-muted-foreground'>
						Visão geral de desempenho dos processos de Outorga Onerosa.
					</p>
				</div>
			</div>
			<div className='flex w-full flex-col gap-4 md:gap-5'>
				<Report processosTotal={relatorio?.processosTotal} totalRecebido={relatorio?.totalRecebido} totalReceber={relatorio?.totalReceber} />
				<div className='grid w-full grid-cols-1 gap-4 xl:grid-cols-2'>
					<ValorRecebidoPorTipo valorTipo={relatorio?.valorTipo} />
					<ProcessosPorTipo quantidadeTipo={relatorio?.quantidadeTipo} />
				</div>
				<ProgressaoSemestralProjetada projecaoMensal={relatorio?.projecaoMensal} />
				<ValorRecebidoAno recebidoMensal={relatorio?.recebidoMensal} />
			</div>
		</div>
	);
}
