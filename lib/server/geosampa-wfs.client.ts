export interface WfsFeatureCollection<T = Record<string, unknown>> {
	type: 'FeatureCollection';
	features: Array<{
		type: 'Feature';
		id?: string;
		geometry?: GeoJsonGeometry | null;
		properties: T;
	}>;
	totalFeatures?: number;
	numberMatched?: number;
}

export type GeoJsonGeometry =
	| { type: 'Point'; coordinates: [number, number] }
	| { type: 'Polygon'; coordinates: number[][][] }
	| { type: 'MultiPolygon'; coordinates: number[][][][] };

export interface LoteProperties {
	cd_setor_fiscal?: string;
	cd_quadra_fiscal?: string;
	cd_lote?: string;
	cd_digito_sql?: number;
	cd_logradouro?: string;
	nm_logradouro_completo?: string;
	cd_numero_porta?: string;
	nm_proprietario?: string;
	qt_area_terreno?: number;
	qt_area_terreno_calc?: number;
	tipo_uso_imovel?: string;
}

export interface OutorgaProperties {
	cd_processo?: string;
	cd_proposta?: number;
	nm_distrito?: string;
	nm_endereco?: string;
	cd_setor_quadra?: string;
	qt_area_terreno?: number;
	cd_coeficiente_utilizacao?: string;
	cd_categoria_uso?: string;
	qt_valor_contrapartida?: number;
	tx_situacao?: string;
	cd_numero_alvara?: string;
}

export interface ZoneamentoProperties {
	tx_zoneamento_perimetro?: string;
	cd_numero_legislacao_zoneamento?: number;
}

const LOTE_FIELDS =
	'cd_setor_fiscal,cd_quadra_fiscal,cd_lote,cd_digito_sql,cd_logradouro,nm_logradouro_completo,cd_numero_porta,nm_proprietario,qt_area_terreno,qt_area_terreno_calc,tipo_uso_imovel,ge_poligono';

const OUTORGA_FIELDS =
	'cd_processo,cd_proposta,nm_distrito,nm_endereco,cd_setor_quadra,qt_area_terreno,cd_coeficiente_utilizacao,cd_categoria_uso,qt_valor_contrapartida,tx_situacao,cd_numero_alvara,ge_ponto';

export class GeosampaWfsClient {
	private readonly baseUrl: string;

	constructor(baseUrl?: string) {
		this.baseUrl =
			baseUrl?.replace(/\/$/, '') ||
			process.env.GEOSAMPA_WFS_URL?.replace(/\/$/, '') ||
			'http://wfs.geosampa.prodam/geoserver/geoportal/wfs';
	}

	static sqlParaCql(sql: string): string {
		const match = sql.trim().match(/^(\d{3})\.(\d{3})\.(\d{4})-(\d)$/);
		if (!match) throw new Error(`SQL inválido: ${sql}`);
		const [, setor, quadra, lote, digito] = match;
		return `cd_setor_fiscal='${setor}' AND cd_quadra_fiscal='${quadra}' AND cd_lote='${lote}' AND cd_digito_sql=${digito}`;
	}

	static processoParaCdProcesso(processo: string): string {
		return processo.replace(/\D/g, '');
	}

	static pontoFromGeometry(
		geometry: GeoJsonGeometry | null | undefined,
	): { x: number; y: number } | null {
		if (!geometry || geometry.type !== 'Point') return null;
		const [x, y] = geometry.coordinates;
		return { x, y };
	}

	static centroidFromGeometry(
		geometry: GeoJsonGeometry | null | undefined,
	): { x: number; y: number } | null {
		if (!geometry) return null;

		let ring: number[][] | undefined;
		if (geometry.type === 'Polygon') {
			ring = geometry.coordinates[0];
		} else if (geometry.type === 'MultiPolygon') {
			ring = geometry.coordinates[0]?.[0];
		} else {
			return null;
		}

		if (!ring?.length) return null;

		const points =
			ring[0][0] === ring[ring.length - 1][0] &&
			ring[0][1] === ring[ring.length - 1][1]
				? ring.slice(0, -1)
				: ring;

		if (!points.length) return null;

		let sumX = 0;
		let sumY = 0;
		for (const [x, y] of points) {
			sumX += x;
			sumY += y;
		}
		return { x: sumX / points.length, y: sumY / points.length };
	}

	async buscarLotePorSql(sql: string) {
		const cql = GeosampaWfsClient.sqlParaCql(sql);
		const data = await this.getFeature<LoteProperties>('geoportal:lote', cql, LOTE_FIELDS);
		return data.features[0] ?? null;
	}

	async buscarOutorgaPorProcesso(processo: string) {
		const cdProcesso = GeosampaWfsClient.processoParaCdProcesso(processo);
		const data = await this.getFeature<OutorgaProperties>(
			'geoportal:outorga_onerosa',
			`cd_processo='${cdProcesso}'`,
			OUTORGA_FIELDS,
		);
		return data.features[0] ?? null;
	}

	async buscarZoneamentoNoPonto(x: number, y: number) {
		const cql = `INTERSECTS(ge_poligono,POINT(${x} ${y}))`;
		return this.getFeature<ZoneamentoProperties>(
			'geoportal:zoneamento_2016_map1',
			cql,
			'tx_zoneamento_perimetro,cd_numero_legislacao_zoneamento',
		);
	}

	async buscarMacroareaNoPonto(x: number, y: number) {
		const cql = `INTERSECTS(ge_poligono,POINT(${x} ${y}))`;
		const data = await this.getFeature<{ nm_macroarea?: string; sg_macroarea?: string }>(
			'geoportal:pde_macroarea_lei_18209',
			cql,
			'nm_macroarea,sg_macroarea',
		);
		return data.features[0]?.properties ?? null;
	}

	async buscarSubprefeituraNoPonto(x: number, y: number) {
		const cql = `INTERSECTS(ge_poligono,POINT(${x} ${y}))`;
		const data = await this.getFeature<{ nm_subprefeitura?: string }>(
			'geoportal:subprefeitura',
			cql,
			'nm_subprefeitura',
		);
		return data.features[0]?.properties ?? null;
	}

	async buscarDistritoNoPonto(x: number, y: number) {
		const cql = `INTERSECTS(ge_poligono,POINT(${x} ${y}))`;
		const data = await this.getFeature<{ nm_distrito_municipal?: string }>(
			'geoportal:distrito_municipal',
			cql,
			'nm_distrito_municipal',
		);
		return data.features[0]?.properties ?? null;
	}

	async buscarSubsetorNoPonto(x: number, y: number) {
		const cql = `INTERSECTS(ge_poligono,POINT(${x} ${y}))`;
		const data = await this.getFeature<{
			nm_subsetor_operacao_urbana?: string;
			nm_operacao_urbana?: string;
		}>(
			'geoportal:subsetor_operacao_urbana',
			cql,
			'nm_subsetor_operacao_urbana,nm_operacao_urbana',
		);
		return data.features[0]?.properties ?? null;
	}

	private async getFeature<T>(
		typeName: string,
		cqlFilter: string,
		propertyName?: string,
	): Promise<WfsFeatureCollection<T>> {
		const params = new URLSearchParams({
			service: 'WFS',
			version: '2.0.0',
			request: 'GetFeature',
			typeName,
			outputFormat: 'application/json',
			cql_filter: cqlFilter,
		});
		if (propertyName) params.set('propertyName', propertyName);

		const url = `${this.baseUrl}?${params.toString()}`;
		const response = await fetch(url, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(30_000),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			throw new Error(
				`WFS ${typeName} retornou HTTP ${response.status}: ${body.slice(0, 300)}`,
			);
		}

		return (await response.json()) as WfsFeatureCollection<T>;
	}
}
