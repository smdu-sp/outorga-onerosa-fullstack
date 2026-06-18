import type {
	IGeoSampaCalculoOutorga,
	IGeoSampaEnquadramentoUrbanistico,
	IGeoSampaResult,
} from '@/types/geosampa';
import { CAMPOS_ZONA } from '@/lib/enquadramento-persistencia';

export function zonasDoEnquadramento(e?: IGeoSampaEnquadramentoUrbanistico): string[] {
	if (!e) return [];
	return CAMPOS_ZONA.map((k) => e[k]).filter((z): z is string => Boolean(z));
}

export function resumoEnquadramento(data: IGeoSampaResult) {
	const e = data.enquadramento_urbanistico;
	return {
		distrito: e?.distrito ?? '',
		subprefeitura: e?.subprefeitura ?? '',
		macrozona: e?.macrozona ?? '',
		macroarea: e?.macroarea ?? '',
		subsetor: e?.subsetor ?? '',
		zonas: zonasDoEnquadramento(e),
		tipologia_uso_oodc: e?.tipologia_uso_oodc ?? '',
	};
}

function parseNumero(valor?: number | string): number {
	if (typeof valor === 'number') return valor;
	if (!valor) return 0;
	const n = Number.parseFloat(String(valor).replace(/\./g, '').replace(',', '.'));
	return Number.isFinite(n) ? n : 0;
}

function parseFpFs(valor?: string): number {
	if (!valor) return 1;
	const n = Number.parseFloat(valor.replace(',', '.'));
	return Number.isFinite(n) ? n : 1;
}

export function resumoParametros(c?: IGeoSampaCalculoOutorga) {
	return {
		coeficiente_basico: parseNumero(c?.coeficiente_basico),
		coeficiente_maximo: parseNumero(c?.coeficiente_utilizado),
		area_terreno: parseNumero(c?.area_terreno),
		valor_m2_quadro14: parseNumero(c?.valor_m2_quadro14),
		fator_planejamento: parseFpFs(c?.fp_uso_r),
		fator_social: parseFpFs(c?.fs_uso_r),
	};
}

export function resumoEndereco(data: IGeoSampaResult): string {
	const principal = data.enderecos?.find((e) => e.ordem === 1) ?? data.enderecos?.[0];
	if (!principal) return '';
	const partes = [principal.tipo, principal.titulo, principal.nome, principal.numero].filter(
		Boolean,
	);
	return partes.join(' ');
}
