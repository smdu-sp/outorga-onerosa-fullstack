/** @format */

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
	cpf_cnpj: string;
};

export type IProcesso = {
	id?: string;
	tipo?: string;
	codigo?: string;
	num_processo: string;
	protocolo_ad?: string;
	data_entrada?: Date;
	parcelas?: IParcela[];
	total_parcelas?: number
};

export interface IRespostaProcesso {
	ok: boolean;
	error: string | null;
	data: IProcessosPaginado | IProcesso[] | IDashboard | null;
	status: number;
}

export interface IProcessosPaginado {
	total: number;
	pagina: number;
	limite: number;
	data?: IProcesso[];
}

export interface IDashboard {
	processosTotal: number;
	totalRecebido: number;
	totalReceber: number;
	quantidadeTipo: { label: string; value: number }[];
	valorTipo: { label: string; value: number }[];
	projecaoMensal: { label: string; value: number }[];
	recebidoMensal: { label: string; value: number }[];
}


export type ICreateProcesso = {
	tipo?: string;
	num_processo: string;
	protocolo_ad?: string;
	data_entrada: Date;
	parcelas?: IParcela[];
	valor_total: number;
};