/** @format */

import { HomeSkeleton } from '@/components/skeleton-blocks';
import { requireAuth } from '@/lib/auth/session';
import { dashboard } from '@/services/processos';
import { IPainelOperacional } from '@/types/processo';
import { Suspense } from 'react';
import { Zap } from 'lucide-react';
import { PageHeader, PageShell, SectionCard, StatGroup } from '@/components/page-shell';
import { PainelAtalhos } from './_components/painel/atalhos';
import { PainelAlertasKpi } from './_components/painel/alertas-kpi';
import { FilaRecentes } from './_components/painel/fila-recentes';
import { FilaVencimentos } from './_components/painel/fila-vencimentos';

export default function HomeSuspense() {
	return (
		<Suspense fallback={<HomeSkeleton />}>
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
		<PageShell>
			<PageHeader title="Painel operacional" />

			<div className="flex w-full flex-col gap-6">
				<SectionCard icon={Zap} title="Ações rápidas">
					<PainelAtalhos />
				</SectionCard>

				<StatGroup>
					<PainelAlertasKpi contagens={contagens} />
				</StatGroup>

				<div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
					<FilaVencimentos itens={painel?.vencimentos30d ?? []} />
					<FilaRecentes itens={painel?.processosRecentes ?? []} />
				</div>
			</div>
		</PageShell>
	);
}
