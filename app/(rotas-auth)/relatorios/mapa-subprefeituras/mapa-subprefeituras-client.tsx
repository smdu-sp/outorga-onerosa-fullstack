'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FiltroPeriodoSubprefeitura } from '@/lib/server/relatorios-subprefeituras';
import type { IRelatorioSubprefeituraDetalhe } from '@/types/relatorio';
import { FiltrosMapaSubprefeituras } from './_components/filtros-mapa-subprefeituras';
import { MapaSubprefeituras } from './_components/mapa-subprefeituras';
import { TabelasMapaSubprefeituras } from './_components/tabelas-mapa-subprefeituras';

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface MapaSubprefeiturasClientProps {
	subprefeituras: IRelatorioSubprefeituraDetalhe[];
	filtro: FiltroPeriodoSubprefeitura;
	periodoLabel: string;
	anosDisponiveis: number[];
}

export function MapaSubprefeiturasClient({
	subprefeituras,
	filtro,
	periodoLabel,
	anosDisponiveis,
}: MapaSubprefeiturasClientProps) {
	const [selecionado, setSelecionado] = useState<string | null>(null);

	const subAtiva = useMemo(
		() => subprefeituras.find((s) => s.chave === selecionado) ?? null,
		[subprefeituras, selecionado],
	);

	useEffect(() => {
		setSelecionado(null);
	}, [filtro.ano, filtro.mes]);

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-5 flex flex-wrap items-start justify-between gap-4">
				<div>
					<Link
						href="/relatorios"
						className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
						<ArrowLeft className="h-4 w-4" />
						Voltar aos relatórios
					</Link>
					<h1 className="text-[28px] font-bold tracking-tight">Mapa por Subprefeitura</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Arrecadação de Outorga Onerosa por subprefeitura · {periodoLabel}
					</p>
				</div>
				{subAtiva && (
					<button
						type="button"
						onClick={() => setSelecionado(null)}
						className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
						Limpar seleção
					</button>
				)}
			</div>

			<FiltrosMapaSubprefeituras
				anosDisponiveis={anosDisponiveis}
				filtro={filtro}
				totalSubprefeituras={subprefeituras.length}
			/>

			<div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
				<MapaSubprefeituras
					subprefeituras={subprefeituras}
					selecionado={selecionado}
					onSelecionar={setSelecionado}
				/>
				{subAtiva && (
					<div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
						<div>
							<span className="text-muted-foreground">Subprefeitura: </span>
							<span className="font-semibold">{subAtiva.nome}</span>
						</div>
						<div>
							<span className="text-muted-foreground">Arrecadado ({periodoLabel}): </span>
							<span className="font-mono font-semibold text-primary">
								{fmtBrl(subAtiva.valBrl)}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Processos: </span>
							<span className="font-semibold">{subAtiva.proc}</span>
						</div>
					</div>
				)}
			</div>

			<TabelasMapaSubprefeituras
				subprefeituras={subprefeituras}
				periodoLabel={periodoLabel}
				selecionado={selecionado}
				onSelecionarSubprefeitura={setSelecionado}
			/>
		</div>
	);
}
