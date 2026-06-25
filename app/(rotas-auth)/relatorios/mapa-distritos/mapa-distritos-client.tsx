'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FiltroPeriodoDistrito } from '@/lib/server/relatorios-distritos';
import type { IRelatorioDistrito } from '@/types/relatorio';
import { FiltrosMapaDistritos } from './_components/filtros-mapa-distritos';
import { MapaDistritos } from './_components/mapa-distritos';
import { TabelasMapaDistritos } from './_components/tabelas-mapa-distritos';

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
					<h1 className="text-[28px] font-bold tracking-tight">Mapa por Distrito</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Arrecadação de Outorga Onerosa por distrito municipal · {periodoLabel}
					</p>
				</div>
				{distritoAtivo && (
					<button
						type="button"
						onClick={() => setSelecionado(null)}
						className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
						Limpar seleção
					</button>
				)}
			</div>

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
		</div>
	);
}
