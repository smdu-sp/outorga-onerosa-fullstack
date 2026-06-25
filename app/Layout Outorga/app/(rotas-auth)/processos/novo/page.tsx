/** @format */

import { ChevronRight, House } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import FormNovoProcesso from './_components/form-novo-processo';

export const metadata = {
	title: 'Novo Processo — Outorga Onerosa',
};

export default function NovoProcessoPage() {
	return (
		<div className="w-full max-w-3xl pb-8">
			{/* Breadcrumb */}
			<nav
				aria-label="Breadcrumb"
				className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
				<Link href="/" className="hover:text-foreground transition-colors">
					<House className="h-3.5 w-3.5" />
					<span className="sr-only">Início</span>
				</Link>
				<ChevronRight className="h-3.5 w-3.5 opacity-50" />
				<Link href="/processos" className="hover:text-foreground transition-colors">
					Processos
				</Link>
				<ChevronRight className="h-3.5 w-3.5 opacity-50" />
				<span className="text-foreground font-medium">Novo processo</span>
			</nav>

			{/* Header */}
			<div className="mb-6">
				<h1 className="text-3xl font-bold tracking-tight">Novo processo</h1>
				<p className="text-muted-foreground mt-1.5 text-sm max-w-xl leading-relaxed">
					Informe o número do processo ou o SQL do lote. O sistema consultará a
					base cartográfica e calculará o enquadramento urbanístico e os
					parâmetros de outorga automaticamente.
				</p>
			</div>

			<Suspense>
				<FormNovoProcesso />
			</Suspense>
		</div>
	);
}
