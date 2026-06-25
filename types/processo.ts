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
	antecipada?: boolean;
	quebra?: boolean;
	cpf_cnpj: string;
};

export type IProcesso = {
	id?: string;
	tipo?: string;
	codigo?: string;
	num_processo: string;
	protocolo_ad?: string;
	data_entrada?: Date;
	status_pagamento?: string;
	parcelas?: IParcela[];
	total_parcelas?: number;
	interessado?: string | null;
	cpf_cnpj?: string | null;
	valor_devido?: number;
	parcelas_pagas?: number;
	parcelas_total?: number;
};

export interface IEstatisticasProcessos {
	total: number;
	em_pagamento: number;
	quitados: number;
	quebras: number;
	a_receber: number;
}

export interface IRespostaProcesso {
	ok: boolean;
	error: string | null;
	data: IProcessosPaginado | IProcesso[] | IProcesso | IDashboard | Record<string, unknown> | null;
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