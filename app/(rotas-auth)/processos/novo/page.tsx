/** @format */

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import FormNovoProcesso from './_components/form-novo-processo';

export const metadata = {
	title: 'Novo Processo — Outorga Onerosa',
};

export default function NovoProcessoPage() {
	return (
		<div className="mx-auto w-full max-w-[920px] px-4 py-[30px] pb-20 sm:px-8">
			<Link
				href="/processos"
				className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
				<ChevronLeft className="h-4 w-4" />
				Processos
				<span className="mx-1 opacity-40">/</span>
				<span className="text-foreground">Novo processo</span>
			</Link>

			<div className="mb-[22px]">
				<h1 className="m-0 text-[30px] font-bold tracking-[-0.01em]">Novo processo</h1>
				<p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
					Informe o número do processo ou o SQL do lote. O sistema consulta a base
					cartográfica e calcula automaticamente o enquadramento urbanístico e os
					parâmetros de outorga.
				</p>
			</div>

			<Suspense>
				<FormNovoProcesso />
			</Suspense>
		</div>
	);
}
