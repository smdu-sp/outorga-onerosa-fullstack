/** @format */

import { TableSkeleton } from '@/components/data-table';
import { requireAuth } from '@/lib/auth/session';
import { dashboard } from '@/services/processos';
import { IPainelOperacional } from '@/types/processo';
import { Suspense } from 'react';
import { PainelAtalhos } from './_components/painel/atalhos';
import { PainelAlertasKpi } from './_components/painel/alertas-kpi';
import { FilaRecentes } from './_components/painel/fila-recentes';
import { FilaVencimentos } from './_components/painel/fila-vencimentos';

export default function HomeSuspense() {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<Home />
		</Suspense>
	);
}

async function Home() {
	await requireAuth();

	const { data, ok } = await dashboard();
	const painel: IPainelOperacional | null = ok ? (data as IPainelOperacional) : null;

	const contagens = painel?.contagens ?? {
		parcelasVencidas: 0,
		parcelasAVencer30d: 0,
		processosNovos: 0,
		pendenciasCriticas: 0,
	};

	return (
		<div className="mx-auto flex w-full flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
			<div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-xs">
				<div className="flex flex-col gap-1">
					<h1 className="text-[25px] font-semibold tracking-tight text-foreground">
						Painel operacional
					</h1>
					<p className="text-sm text-muted-foreground">
						Atalhos e fila do dia — o que precisa de atenção agora. Análise e gráficos ficam
						em Relatórios.
					</p>
				</div>
			</div>

			<PainelAtalhos />
			<PainelAlertasKpi contagens={contagens} />

			<div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
				<FilaVencimentos itens={painel?.vencimentos30d ?? []} />
				<FilaRecentes itens={painel?.processosRecentes ?? []} />
			</div>
		</div>
	);
}
