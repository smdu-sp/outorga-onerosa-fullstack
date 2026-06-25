'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoIdentity, geoPath } from 'd3-geo';
import { scaleSequential } from 'd3-scale';
import { normalizarSubprefeitura } from '@/lib/geo/normalizar-subprefeitura';
import type { IRelatorioSubprefeituraDetalhe } from '@/types/relatorio';

type GeoGeometry = {
	type: string;
	coordinates: unknown;
};

type SubprefeituraProperties = {
	nm_subprefeitura?: string;
	sg_subprefeitura?: string;
};

type SubprefeituraFeature = {
	type: 'Feature';
	geometry: GeoGeometry;
	properties: SubprefeituraProperties;
};

type SubprefeituraFeatureCollection = {
	type: 'FeatureCollection';
	features: SubprefeituraFeature[];
};

const fmtM = (v: number) =>
	`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;

function corArrecadacao(t: number): string {
	const lightness = 88 - t * 52;
	return `hsl(215, 72%, ${lightness}%)`;
}

interface MapaSubprefeiturasProps {
	subprefeituras: IRelatorioSubprefeituraDetalhe[];
	geojsonUrl?: string;
	selecionado: string | null;
	onSelecionar: (chave: string | null) => void;
}

export function MapaSubprefeituras({
	subprefeituras,
	geojsonUrl = '/camadas/geoportal_subprefeitura_v2.geojson',
	selecionado,
	onSelecionar,
}: MapaSubprefeiturasProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [geojson, setGeojson] = useState<SubprefeituraFeatureCollection | null>(null);
	const [erro, setErro] = useState<string | null>(null);
	const [dims, setDims] = useState({ width: 800, height: 520 });

	const valorPorChave = useMemo(() => {
		const mapa = new Map<string, IRelatorioSubprefeituraDetalhe>();
		for (const s of subprefeituras) mapa.set(s.chave, s);
		return mapa;
	}, [subprefeituras]);

	const maxVal = useMemo(() => Math.max(...subprefeituras.map((s) => s.val), 0.01), [subprefeituras]);

	const escalaCor = useMemo(
		() => scaleSequential([0, maxVal], corArrecadacao),
		[maxVal],
	);

	useEffect(() => {
		let ativo = true;
		fetch(geojsonUrl)
			.then((r) => {
				if (!r.ok) throw new Error(`Falha ao carregar camada (${r.status})`);
				return r.json();
			})
			.then((data: SubprefeituraFeatureCollection) => {
				if (ativo) setGeojson(data);
			})
			.catch((e: Error) => {
				if (ativo) setErro(e.message);
			});
		return () => {
			ativo = false;
		};
	}, [geojsonUrl]);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new ResizeObserver(([entry]) => {
			const w = Math.max(entry.contentRect.width, 320);
			setDims({ width: w, height: Math.round(w * 0.62) });
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const paths = useMemo(() => {
		if (!geojson) return [];

		const projection = geoIdentity().reflectY(true).fitSize([dims.width, dims.height], geojson);
		const pathGen = geoPath(projection);

		return geojson.features.map((feature) => {
			const nome = feature.properties?.nm_subprefeitura ?? '';
			const chave = normalizarSubprefeitura(nome);
			const dados = valorPorChave.get(chave);
			const val = dados?.val ?? 0;
			const d = pathGen(feature);
			if (!d) return null;

			return {
				chave,
				nome,
				val,
				d,
				centroid: pathGen.centroid(feature),
			};
		}).filter((p): p is NonNullable<typeof p> => p != null);
	}, [geojson, dims, valorPorChave]);

	return (
		<div ref={containerRef} className="w-full">
			{erro ? (
				<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
					{erro}
				</p>
			) : !geojson ? (
				<div
					className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground"
					style={{ height: dims.height }}>
					Carregando mapa…
				</div>
			) : (
				<div className="relative overflow-hidden rounded-lg border border-border bg-slate-50 dark:bg-slate-900/40">
					<svg
						width={dims.width}
						height={dims.height}
						viewBox={`0 0 ${dims.width} ${dims.height}`}
						className="block w-full"
						role="img"
						aria-label="Mapa de arrecadação por subprefeitura">
						{paths.map((p) => {
							const ativo = selecionado == null || selecionado === p.chave;
							const selecionadoAtivo = selecionado === p.chave;
							return (
								<path
									key={p.chave}
									d={p.d}
									fill={p.val > 0 ? escalaCor(p.val) : '#e2e8f0'}
									stroke={selecionadoAtivo ? '#1d4ed8' : '#94a3b8'}
									strokeWidth={selecionadoAtivo ? 2 : 0.8}
									opacity={ativo ? 1 : 0.35}
									className="cursor-pointer transition-opacity hover:opacity-90"
									onClick={() => onSelecionar(selecionadoAtivo ? null : p.chave)}>
									<title>
										{p.nome}: {p.val > 0 ? fmtM(p.val) : 'Sem arrecadação'}
									</title>
								</path>
							);
						})}
					</svg>

					<div className="absolute bottom-3 right-3 rounded-md border border-border bg-card/95 px-3 py-2 text-[10px] shadow-sm backdrop-blur-sm">
						<div className="mb-1 font-semibold text-muted-foreground">Arrecadação (R$ M)</div>
						<div className="flex items-center gap-2">
							<span>0</span>
							<div
								className="h-2 w-24 rounded-full"
								style={{
									background: `linear-gradient(to right, ${corArrecadacao(0)}, ${corArrecadacao(1)})`,
								}}
							/>
							<span>{fmtM(maxVal)}</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
