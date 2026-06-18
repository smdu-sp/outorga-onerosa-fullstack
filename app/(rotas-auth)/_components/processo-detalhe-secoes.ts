/** @format */

import { IProcessoDetalhe } from '@/types/processo-detalhe';
import {
	LABELS_ANOTACOES,
	LABELS_CALCULO_OUTORGA,
	LABELS_COORDENADA,
	LABELS_COTA,
	LABELS_ENDERECO,
	LABELS_ENQUADRAMENTO,
	LABELS_LICENCA,
	LABELS_LOCALIZACAO_LOTE,
	LABELS_MONITORAMENTO_FICHA,
	LABELS_PARCELA,
	LABELS_PROCESSO,
	LABELS_SITUACAO,
	LABELS_SUBCATEGORIA_USO,
} from './processo-detalhe-labels';

export type SecaoGrid = {
	tipo: 'grid';
	id: string;
	titulo: string;
	tabela: string;
	labels: Record<string, string>;
	getDados: (detalhe: IProcessoDetalhe) => Record<string, unknown> | null | undefined;
};

export type SecaoLista = {
	tipo: 'parcelas' | 'enderecos' | 'licencas';
	id: string;
	titulo: string;
	tabela: string;
	getLista: (detalhe: IProcessoDetalhe) => Record<string, unknown>[] | undefined;
};

export type SecaoDetalhe = SecaoGrid | SecaoLista;

/** Todas as tabelas/colunas do schema ligadas ao processo, na ordem de leitura. */
export const SECOES_PROCESSO_DETALHE: SecaoDetalhe[] = [
	{
		tipo: 'grid',
		id: 'processo',
		titulo: 'Dados do Processo',
		tabela: 'processos',
		labels: LABELS_PROCESSO,
		getDados: (d) => d as unknown as Record<string, unknown>,
	},
	{
		tipo: 'parcelas',
		id: 'parcelas',
		titulo: 'Parcelas',
		tabela: 'parcelas',
		getLista: (d) => (d.parcelas ?? []) as unknown as Record<string, unknown>[],
	},
	{
		tipo: 'grid',
		id: 'monitoramento',
		titulo: 'Ficha de Monitoramento',
		tabela: 'monitoramento_fichas',
		labels: LABELS_MONITORAMENTO_FICHA,
		getDados: (d) => d.monitoramento as unknown as Record<string, unknown>,
	},
	{
		tipo: 'grid',
		id: 'coordenada',
		titulo: 'Coordenada',
		tabela: 'monitoramento_coordenadas',
		labels: LABELS_COORDENADA,
		getDados: (d) =>
			d.monitoramento?.coordenada as unknown as Record<string, unknown>,
	},
	{
		tipo: 'grid',
		id: 'localizacao',
		titulo: 'Localização do Lote',
		tabela: 'monitoramento_localizacao_lote',
		labels: LABELS_LOCALIZACAO_LOTE,
		getDados: (d) =>
			d.monitoramento?.localizacao_lote as unknown as Record<string, unknown>,
	},
	{
		tipo: 'enderecos',
		id: 'enderecos',
		titulo: 'Endereços',
		tabela: 'monitoramento_enderecos',
		getLista: (d) =>
			(d.monitoramento?.enderecos ?? []) as unknown as Record<string, unknown>[],
	},
	{
		tipo: 'grid',
		id: 'enquadramento',
		titulo: 'Enquadramento urbanístico',
		tabela: 'monitoramento_enquadramento_urbanistico',
		labels: LABELS_ENQUADRAMENTO,
		getDados: (d) =>
			d.monitoramento?.enquadramento_urbanistico as unknown as Record<
				string,
				unknown
			>,
	},
	{
		tipo: 'grid',
		id: 'subcategorias',
		titulo: 'Subcategorias de uso',
		tabela: 'monitoramento_subcategorias_uso',
		labels: LABELS_SUBCATEGORIA_USO,
		getDados: (d) =>
			d.monitoramento?.subcategorias_uso as unknown as Record<string, unknown>,
	},
	{
		tipo: 'grid',
		id: 'calculo',
		titulo: 'Cálculo da Outorga',
		tabela: 'monitoramento_calculo_outorga',
		labels: LABELS_CALCULO_OUTORGA,
		getDados: (d) =>
			d.monitoramento?.calculo_outorga as unknown as Record<string, unknown>,
	},
	{
		tipo: 'grid',
		id: 'situacao',
		titulo: 'Situação',
		tabela: 'monitoramento_situacao',
		labels: LABELS_SITUACAO,
		getDados: (d) => d.monitoramento?.situacao as unknown as Record<string, unknown>,
	},
	{
		tipo: 'licencas',
		id: 'licencas',
		titulo: 'Licenças (alvarás / certificado)',
		tabela: 'monitoramento_licencas',
		getLista: (d) =>
			(d.monitoramento?.licencas ?? []) as unknown as Record<string, unknown>[],
	},
	{
		tipo: 'grid',
		id: 'anotacoes',
		titulo: 'Anotações DEUSO',
		tabela: 'monitoramento_anotacoes_deuso',
		labels: LABELS_ANOTACOES,
		getDados: (d) =>
			d.monitoramento?.anotacoes_deuso as unknown as Record<string, unknown>,
	},
	{
		tipo: 'grid',
		id: 'cota',
		titulo: 'Cota de Solidariedade',
		tabela: 'monitoramento_cota_solidariedade',
		labels: LABELS_COTA,
		getDados: (d) => d.monitoramento_cota as unknown as Record<string, unknown>,
	},
];

export { LABELS_PARCELA, LABELS_ENDERECO, LABELS_LICENCA };
