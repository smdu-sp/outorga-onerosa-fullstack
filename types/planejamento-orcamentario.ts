export type MetodoDistribuicao = 'MEDIA_HISTORICA' | 'IGUAL';

export interface IPlanejamentoParametroCorrecao {
	id?: string;
	nome: string;
	percentual: number;
	ordem?: number;
}

export interface IPlanejamentoOrcamentarioMes {
	id?: string;
	mes: number; // 1–12
	valor: number;
	editado_manualmente?: boolean;
}

export interface IPlanejamentoOrcamentario {
	id: string;
	ano: number;
	media_base_3_anos: number;
	valor_anual: number;
	metodo_distribuicao: MetodoDistribuicao;
	criado_em: Date;
	alterado_em: Date;
	parametros: IPlanejamentoParametroCorrecao[];
	meses: IPlanejamentoOrcamentarioMes[];
	historico: IHistoricoAnoArrecadado[];
}

export interface IPlanejamentoResumo {
	ano: number;
	valor_anual: number;
	alterado_em: Date;
	editavel: boolean;
}

export interface IHistoricoAnoArrecadado {
	ano: number;
	total: number;
	valor_ajustado?: number | null;
}

export interface ISugestaoPlanejamento {
	ano: number;
	media_base_3_anos: number;
	valor_anual: number;
	metodo_distribuicao: MetodoDistribuicao;
	parametros: IPlanejamentoParametroCorrecao[];
	meses: IPlanejamentoOrcamentarioMes[];
	historico: IHistoricoAnoArrecadado[];
}

export interface IPlanejamentoRevisao {
	id: string;
	motivo: string;
	valor_anual_anterior: number;
	valor_anual_novo: number;
	revisado_por_nome: string | null;
	revisado_em: Date;
}

export interface IComparativoMes {
	mes: number;
	nome_mes: string;
	planejado: number;
	executado: number;
}

export interface IComparativoPlanejamentoExecutado {
	ano: number;
	meses: IComparativoMes[];
	total_planejado: number;
	total_executado: number;
	percentual_executado: number;
	saldo: number;
}

export interface IConfiguracaoPlanejamento {
	dia_limite: number;
	mes_limite: number;
	alterado_em: Date | null;
}

/** Carga inicial da tela de edição de um ano: plano salvo (se houver), se ainda é editável e o histórico-base. */
export interface IDetalhePlanejamentoAno {
	ano: number;
	plano: IPlanejamentoOrcamentario | null;
	editavel: boolean;
	historico: IHistoricoAnoArrecadado[];
}

export interface IRespostaPlanejamento {
	ok: boolean;
	error: string | null;
	data:
		| IPlanejamentoOrcamentario
		| IPlanejamentoResumo[]
		| ISugestaoPlanejamento
		| IComparativoPlanejamentoExecutado
		| IConfiguracaoPlanejamento
		| IDetalhePlanejamentoAno
		| IPlanejamentoRevisao[]
		| number[]
		| null;
	status: number;
}
