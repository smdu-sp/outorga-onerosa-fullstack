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
	const { data, ok, error, status } = await dashboard();
	let relatorio: IDashboard | null = null;
	if (ok) {
		relatorio = data as IDashboard;
	}
	return (
		<div className='container mx-auto w-full'>
			<div className='flex flex-col gap-2 mb-5'>
				<h1 className='text-4xl font-bold'>Dashboard</h1>
				<p className='text-muted-foreground'>
					Relatório completo de processos de Outorga
				</p>
			</div>
			<div className='flex flex-col gap-5 w-full'>
				<Report processosTotal={relatorio?.processosTotal} totalRecebido={relatorio?.totalRecebido} totalReceber={relatorio?.totalReceber} />
				<div className='grid grid-cols-2 gap-5 w-full'>
					<ValorRecebidoPorTipo valorTipo={relatorio?.valorTipo} />
					<ProcessosPorTipo quantidadeTipo={relatorio?.quantidadeTipo} />
				</div>
				<ProgressaoSemestralProjetada projecaoMensal={relatorio?.projecaoMensal} />
				<ValorRecebidoAno recebidoMensal={relatorio?.recebidoMensal} />
			</div>
		</div>
	);
}
