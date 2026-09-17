'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FiltroPeriodoDistrito } from '@/lib/server/relatorios-distritos';
import type { IRelatorioDistrito } from '@/types/relatorio';
import { PageHeader, PageShell } from '@/components/page-shell';
import { FiltrosMapaDistritos } from './_components/filtros-mapa-distritos';
import { MapaDistritos } from './_components/mapa-distritos';
import { TabelasMapaDistritos } from './_components/tabelas-mapa-distritos';
import { BotaoExportarExcel } from '../_components/botao-exportar-excel';

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface MapaDistritosClientProps {
	distritos: IRelatorioDistrito[];
	filtro: FiltroPeriodoDistrito;
	periodoLabel: string;
	anosDisponiveis: number[];
}

export function MapaDistritosClient({
	distritos,
	filtro,
	periodoLabel,
	anosDisponiveis,
}: MapaDistritosClientProps) {
	const [selecionado, setSelecionado] = useState<string | null>(null);

	const distritoAtivo = useMemo(
		() => distritos.find((d) => d.chave === selecionado) ?? null,
		[distritos, selecionado],
	);

	useEffect(() => {
		setSelecionado(null);
	}, [filtro.ano, filtro.mes, filtro.dataInicio, filtro.dataFim]);

	return (
		<PageShell>
			<PageHeader
				title="Mapa por Distrito"
				breadcrumb={
					<Link
						href="/relatorios"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
						<ArrowLeft className="h-4 w-4" />
						Voltar aos relatórios
					</Link>
				}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<BotaoExportarExcel tipo="distritos" />
						{distritoAtivo && (
							<button
								type="button"
								onClick={() => setSelecionado(null)}
								className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
								Limpar seleção
							</button>
						)}
					</div>
				}>
				<span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
					Arrecadação por distrito municipal · {periodoLabel}
				</span>
			</PageHeader>

			<FiltrosMapaDistritos
				anosDisponiveis={anosDisponiveis}
				filtro={filtro}
				totalDistritos={distritos.length}
			/>

			<div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
				<MapaDistritos
					distritos={distritos}
					selecionado={selecionado}
					onSelecionar={setSelecionado}
				/>
				{distritoAtivo && (
					<div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
						<div>
							<span className="text-muted-foreground">Distrito: </span>
							<span className="font-semibold">{distritoAtivo.nome}</span>
						</div>
						<div>
							<span className="text-muted-foreground">Arrecadado ({periodoLabel}): </span>
							<span className="font-mono font-semibold text-primary">
								{fmtBrl(distritoAtivo.valBrl)}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Processos: </span>
							<span className="font-semibold">{distritoAtivo.proc}</span>
						</div>
					</div>
				)}
			</div>

			<TabelasMapaDistritos
				distritos={distritos}
				periodoLabel={periodoLabel}
				selecionado={selecionado}
				onSelecionarDistrito={setSelecionado}
			/>
		</PageShell>
	);
}
