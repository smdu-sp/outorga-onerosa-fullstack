/** @format */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { RelatorioSubpaginaSkeleton } from '@/components/skeleton-blocks';
import { PageHeader, PageShell, StatGroup } from '@/components/page-shell';
import { relatorioMes } from '@/services/relatorios/mes';
import { KpiMes } from './_components/kpi-mes';
import { GraficoSemanas } from './_components/grafico-semanas';
import { StatusComposicao } from './_components/status-composicao';
import { ComparativoAnoAnterior } from './_components/comparativo-ano-anterior';
import { ArrecadacaoPorRegiao } from './_components/arrecadacao-regiao';
import { TabelaProcessosMes } from './_components/tabela-processos';
import { BotaoExportarExcel } from '../../../_components/botao-exportar-excel';

type Params = Promise<{ ano: string; mes: string }>;

export default async function RelatorioMesPage({ params }: { params: Params }) {
	const { ano: anoStr, mes: mesStr } = await params;
	return (
		<Suspense fallback={<RelatorioSubpaginaSkeleton />}>
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
		<PageShell>
			<PageHeader
				title={`${d.nomeMes} ${ano}`}
				breadcrumb={
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Link
							href="/relatorios"
							className="flex items-center gap-1 no-underline hover:text-foreground transition-colors">
							<ArrowLeft className="h-3.5 w-3.5" />
							Relatórios
						</Link>
						<span className="opacity-40">/</span>
						<span>{ano}</span>
						<span className="opacity-40">/</span>
						<span className="font-semibold text-foreground">{d.nomeMes}</span>
					</div>
				}
				actions={
					<>
						<Suspense>
							<BotaoExportarExcel
								tipo="mes"
								extraParams={{ ano: String(ano), mes: String(mes) }}
							/>
						</Suspense>
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
					</>
				}
			/>

			<div className="flex flex-col gap-6">
				{(d.estimado ?? 0) > 0 && <p className="text-sm text-muted-foreground">O total inclui {(d.estimado ?? 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})} com mês estimado pelo vencimento, sem data exata de pagamento. O gráfico semanal utiliza a mesma regra.</p>}
				<StatGroup>
					<KpiMes d={d} />
				</StatGroup>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
					<GraficoSemanas d={d} />
					<StatusComposicao d={d} />
				</div>

				<ComparativoAnoAnterior d={d} />

				<ArrecadacaoPorRegiao d={d} />

				<TabelaProcessosMes processos={d.processos} />
			</div>
		</PageShell>
	);
}
