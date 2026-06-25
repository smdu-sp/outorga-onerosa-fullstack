/** @format */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from '@/components/data-table';
import { relatorioMes } from '@/services/relatorios/mes';
import { KpiMes } from './_components/kpi-mes';
import { GraficoSemanas } from './_components/grafico-semanas';
import { StatusComposicao } from './_components/status-composicao';
import { ComparativoAnoAnterior } from './_components/comparativo-ano-anterior';
import { TabelaProcessosMes } from './_components/tabela-processos';

type Params = Promise<{ ano: string; mes: string }>;

export default async function RelatorioMesPage({ params }: { params: Params }) {
	const { ano: anoStr, mes: mesStr } = await params;
	return (
		<Suspense fallback={<TableSkeleton />}>
			<RelatorioMesHome anoStr={anoStr} mesStr={mesStr} />
		</Suspense>
	);
}

async function RelatorioMesHome({ anoStr, mesStr }: { anoStr: string; mesStr: string }) {
	const ano = Number(anoStr);
	const mes = Number(mesStr);

	if (!ano || !mes || mes < 1 || mes > 12 || isNaN(ano)) notFound();

	const resp = await relatorioMes(ano, mes);
	if (!resp.ok || !resp.data) notFound();

	const d = resp.data;

	const mesPrev = mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
	const mesProx = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
	const hoje = new Date();
	const mesProxFuturo = mesProx.ano > hoje.getFullYear() ||
		(mesProx.ano === hoje.getFullYear() && mesProx.mes > hoje.getMonth() + 1);

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			{/* Breadcrumb + navegação */}
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3 text-sm text-muted-foreground">
					<Link href="/relatorios" className="flex items-center gap-1 hover:text-foreground transition-colors">
						<ArrowLeft className="h-3.5 w-3.5" />
						Relatórios
					</Link>
					<span>/</span>
					<span>{ano}</span>
					<span>/</span>
					<span className="font-semibold text-foreground">{d.nomeMes}</span>
				</div>

				<div className="flex items-center gap-2">
					<Link
						href={`/relatorios/mes/${mesPrev.ano}/${mesPrev.mes}`}
						className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
						<ChevronLeft className="h-3.5 w-3.5" />
						Mês anterior
					</Link>
					{!mesProxFuturo && (
						<Link
							href={`/relatorios/mes/${mesProx.ano}/${mesProx.mes}`}
							className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
							Próximo mês
							<ChevronRight className="h-3.5 w-3.5" />
						</Link>
					)}
				</div>
			</div>

			{/* Título */}
			<div className="mb-6">
				<h1 className="text-[28px] font-bold tracking-tight">
					{d.nomeMes} {ano}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Outorga Onerosa do Direito de Construir — São Paulo · Detalhe mensal
				</p>
			</div>

			<div className="flex flex-col gap-6">
				<KpiMes d={d} />

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
					<GraficoSemanas d={d} />
					<StatusComposicao d={d} />
				</div>

				<ComparativoAnoAnterior d={d} />

				<TabelaProcessosMes processos={d.processos} />
			</div>
		</div>
	);
}
