/** @format */

import type { CodigoPendencia } from '@/lib/pendencias-processo';

export enum ITipoProcesso {
	PDE,
	COTA,
}

export type IParcela = {
	id?: string;
	num_parcela: number;
	valor: number;
	vencimento: Date;
	data_quitacao?: Date;
	ano_pagamento?: number;
	status_quitacao?: boolean;
	antecipada?: boolean;
	quebra?: boolean;
	cpf_cnpj?: string | null;
	obrigacao?: 'PDE' | 'COTA' | 'AIU' | null;
};

export type IProcesso = {
	id?: string;
	tipo?: string;
	codigo?: string;
	num_processo: string;
	protocolo_ad?: string;
	data_entrada?: Date;
	status_pagamento?: string;
	origem?: string;
	criado_por?: string;
	parcelas?: IParcela[];
	total_parcelas?: number;
	interessado?: string | null;
	cpf_cnpj?: string | null;
	valor_devido?: number;
	parcelas_pagas?: number;
	parcelas_total?: number;
	pendencias?: CodigoPendencia[];
};

export interface IEstatisticasProcessos {
	total: number;
	em_pagamento: number;
	quitados: number;
	quebras: number;
	valor_quebra: number;
}

export interface IRespostaProcesso {
	ok: boolean;
	error: string | null;
	data:
		| IProcessosPaginado
		| IProcesso[]
		| IProcesso
		| IPainelOperacional
		| Record<string, unknown>
		| null;
	status: number;
}

export interface IProcessosPaginado {
	total: number;
	pagina: number;
	limite: number;
	data?: IProcesso[];
}

export interface IPainelVencimento {
	parcelaId: string;
	processoId: string;
	numProcesso: string;
	interessado: string;
	tipo: string;
	valor: number;
	vencimento: string;
	dias: number;
	numParcela: number;
}

export interface IPainelProcessoRecente {
	id: string;
	numProcesso: string;
	interessado: string;
	tipo: string | null;
	statusPagamento: string;
	dataEntrada: string | null;
	criadoEm: string;
	pendencias: string[];
	temPendenciaCritica: boolean;
}

export interface IPainelOperacional {
	contagens: {
		parcelasVencidas: number;
		parcelasAVencer30d: number;
		processosNovos: number;
		pendenciasCriticas: number;
	};
	vencimentos30d: IPainelVencimento[];
	processosRecentes: IPainelProcessoRecente[];
}


export type ICreateProcesso = {
	tipo?: string;
	num_processo: string;
	protocolo_ad?: string;
	data_entrada: Date;
	origem?: string;
	parcelas?: IParcela[];
	valor_total: number;
};