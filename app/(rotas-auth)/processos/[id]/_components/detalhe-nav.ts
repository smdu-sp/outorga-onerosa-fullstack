/** @format */

import { SECOES_PROCESSO_DETALHE, type SecaoDetalhe } from '@/app/(rotas-auth)/_components/processo-detalhe-secoes';
import { IProcessoDetalhe } from '@/types/processo-detalhe';

export type NavDetalheItem = {
	id: string;
	label: string;
	locked?: boolean;
};

export type NavDetalheGrupo = {
	grupo: string;
	itens: NavDetalheItem[];
};

export const NAV_DETALHE: NavDetalheGrupo[] = [
	{
		grupo: 'Processo',
		itens: [
			{ id: 'processo', label: 'Dados do Processo' },
			{ id: 'parcelas', label: 'Parcelas' },
			{ id: 'cota', label: 'Cota de Solidariedade' },
		],
	},
	{
		grupo: 'Monitoramento DEUSO',
		itens: [
			{ id: 'monitoramento', label: 'Ficha de Monitoramento' },
			{ id: 'coordenada', label: 'Coordenada' },
			{ id: 'localizacao', label: 'Localização do Lote' },
			{ id: 'enderecos', label: 'Endereços' },
			{ id: 'enquadramento', label: 'Enquadramento Urbanístico' },
			{ id: 'subcategorias', label: 'Subcategorias de Uso' },
			{ id: 'calculo', label: 'Cálculo da Outorga', locked: true },
			{ id: 'situacao', label: 'Situação' },
			{ id: 'licencas', label: 'Licenças' },
			{ id: 'anotacoes', label: 'Anotações DEUSO' },
		],
	},
];

const CAMPOS_IGNORADOS = new Set([
	'id',
	'processo_id',
	'monitoramento_ficha_id',
	'criado_em',
	'alterado_em',
]);

export function secaoPorId(id: string): SecaoDetalhe | undefined {
	return SECOES_PROCESSO_DETALHE.find((s) => s.id === id);
}

function valorPreenchido(valor: unknown): boolean {
	if (valor === null || valor === undefined || valor === '') return false;
	if (typeof valor === 'boolean') return true;
	if (typeof valor === 'number') return true;
	if (typeof valor === 'string') return valor.trim() !== '' && valor.trim() !== '—';
	return true;
}

export function contarPreenchidos(
	secao: SecaoDetalhe,
	detalhe: IProcessoDetalhe,
): number {
	if (secao.tipo === 'parcelas' || secao.tipo === 'enderecos' || secao.tipo === 'licencas') {
		return (secao.getLista(detalhe) ?? []).length;
	}
	if (secao.tipo === 'grid') {
		const dados = secao.getDados(detalhe);
		return Object.keys(secao.labels)
			.filter((chave) => !CAMPOS_IGNORADOS.has(chave))
			.filter((chave) => valorPreenchido(dados?.[chave])).length;
	}
	return 0;
}

export function contarTotalCampos(secao: SecaoDetalhe): number {
	if (secao.tipo === 'grid') {
		return Object.keys(secao.labels).filter((chave) => !CAMPOS_IGNORADOS.has(chave)).length;
	}
	return 0;
}

export function badgeNav(secao: SecaoDetalhe, detalhe: IProcessoDetalhe): number | null {
	const count = contarPreenchidos(secao, detalhe);
	if (secao.tipo === 'grid') return count > 0 ? count : null;
	return count > 0 ? count : null;
}

export function secaoSemRegistro(secao: SecaoDetalhe, detalhe: IProcessoDetalhe): boolean {
	if (secao.id === 'cota') return !detalhe.monitoramento_cota;
	if (secao.tabela.startsWith('monitoramento_') && secao.id !== 'cota') {
		return !detalhe.monitoramento;
	}
	return false;
}

export function filtrarNavPorBusca(busca: string): NavDetalheGrupo[] {
	const q = busca.trim().toLowerCase();
	if (!q) return NAV_DETALHE;
	return NAV_DETALHE.map((grupo) => ({
		...grupo,
		itens: grupo.itens.filter((item) => {
			const secao = secaoPorId(item.id);
			if (!secao) return false;
			if (item.label.toLowerCase().includes(q)) return true;
			if (secao.tipo === 'grid') {
				return Object.values(secao.labels).some((l) => l.toLowerCase().includes(q));
			}
			return false;
		}),
	})).filter((g) => g.itens.length > 0);
}
