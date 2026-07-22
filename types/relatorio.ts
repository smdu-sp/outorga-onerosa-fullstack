/** @format */

export interface IRelatorioMensal {
	prev: (number | null)[];
	real: (number | null)[];
	quebras: (number | null)[];
	antec: (number | null)[];
}

export interface IRelatorioHistorico {
	[ano: number]: number[];
}

export interface IRelatorioTop10 {
	id: string;
	num: string;
	int: string;
	tipo: string;
	total: number;
	pago: number;
	status: 'andamento' | 'quitado' | 'quebra';
	sub: string;
	venc: string | null;
	/** Origem do processo (SISACOE, SEI, Aprova Digital…) */
	sistema: string | null;
	/** Endereço do empreendimento */
	empreendimento: string | null;
	distrito: string | null;
}

export interface IRelatorioSubprefeitura {
	nome: string;
	val: number;
	proc: number;
}

export interface IRelatorioSubprefeituraProcesso {
	id: string;
	num: string;
	interessado: string;
	val: number;
	valBrl: number;
}

export interface IRelatorioSubprefeituraDetalhe {
	chave: string;
	nome: string;
	val: number;
	valBrl: number;
	proc: number;
	processos: IRelatorioSubprefeituraProcesso[];
}

export interface IRelatorioDistritoProcesso {
	id: string;
	num: string;
	interessado: string;
	/** Valor em milhões (visualização no mapa) */
	val: number;
	/** Valor integral em reais */
	valBrl: number;
}

export interface IRelatorioDistrito {
	chave: string;
	nome: string;
	/** Valor em milhões (visualização no mapa) */
	val: number;
	/** Valor integral em reais */
	valBrl: number;
	proc: number;
	processos: IRelatorioDistritoProcesso[];
}

export interface IRelatorioAlerta {
	num: string;
	int: string;
	val: number;
	venc: string;
	dias: number;
	tipo: string;
}

export interface IRelatorioPdeCota {
	total: number;
	pago: number;
	count: number;
	andamento: number;
	quitado: number;
	quebra: number;
}

export interface IRelatorioMesProcesso {
	id: string;
	num: string;
	interessado: string;
	tipo: string;
	valor: number;
	status: 'pago_prazo' | 'pago_atraso' | 'aberto' | 'quebra';
	vencimento: string;
	quitacao: string | null;
	/** Origem do processo (SISACOE, SEI, Aprova Digital…) */
	sistema: string | null;
	/** Endereço do empreendimento */
	empreendimento: string | null;
	distrito: string | null;
	subprefeitura: string | null;
}

export interface IRelatorioMesSemana {
	label: string;
	previsto: number;
	realizado: number;
}

/** Arrecadação do mês agregada por subprefeitura ou distrito. */
export interface IRelatorioMesRegiao {
	nome: string;
	valBrl: number;
	proc: number;
}

export interface IRelatorioMesDetalhe {
	ano: number;
	mes: number;
	nomeMes: string;
	previsto: number;
	realizado: number;
	quebras: number;
	antecipacoes: number;
	semanas: IRelatorioMesSemana[];
	processos: IRelatorioMesProcesso[];
	/** Arrecadação do mês por subprefeitura (maior → menor) */
	subprefeituras: IRelatorioMesRegiao[];
	/** Arrecadação do mês por distrito (maior → menor) */
	distritos: IRelatorioMesRegiao[];
	anoAnterior: { previsto: number; realizado: number };
	countStatus: { pagoPrazo: number; pagoAtraso: number; aberto: number; quebra: number };
}

export interface IRelatorioSaudeKpis {
	/** Soma do valor de todas as parcelas da coorte (universo previsto) */
	previsto: number;
	arrecadado: number;
	/** Parcelas quebradas (quebra=true) */
	quebraValor: number;
	quebraCount: number;
	/** Não quitadas e não quebradas */
	emAbertoValor: number;
	emAbertoCount: number;
	/** Em aberto e já vencidas (inadimplência) */
	vencidoValor: number;
	vencidoCount: number;
	/** Pagamentos antecipados */
	antecipadoValor: number;
	antecipadoCount: number;
	mediaDiasAntecipacao: number | null;
	/** Subconjunto de quitadas com data_quitacao (tempo de pagamento) */
	comDataQuitCount: number;
	pagoPrazoCount: number;
	pagoAtrasoCount: number;
	mediaDiasAtraso: number | null;
	/** % das parcelas quitadas que têm data exata de quitação */
	coberturaDataQuit: number;
	/** Taxas derivadas (%) */
	taxaQuebra: number;
	taxaInadimplencia: number;
	taxaArrecadacao: number;
}

export interface IRelatorioSaudeRegiao {
	nome: string;
	previsto: number;
	arrecadado: number;
	/** Não pago e sem quebra (inclui parcelas a vencer + vencidas) */
	emAbertoValor: number;
	quebraValor: number;
	/** Subconjunto de emAbertoValor já vencido (inadimplência) */
	vencidoValor: number;
	taxaQuebra: number;
	taxaInadimplencia: number;
	proc: number;
}

export interface IRelatorioSaudeTipo {
	tipo: string;
	previsto: number;
	arrecadado: number;
	quebraValor: number;
	taxaQuebra: number;
}

export interface IRelatorioSaudeBucket {
	label: string;
	count: number;
	valor: number;
}

export interface IRelatorioSaude {
	ano: number | null;
	anos: number[];
	kpis: IRelatorioSaudeKpis;
	porSubprefeitura: IRelatorioSaudeRegiao[];
	porTipo: IRelatorioSaudeTipo[];
	/** Distribuição do tempo de pagamento (antecipado → atraso) */
	distribuicaoPagamento: IRelatorioSaudeBucket[];
}

export interface IRelatorioZonaLinha {
	/** Sigla da zona de uso (Lei 16.402/2016) */
	zona: string;
	outorgaValor: number;
	outorgaProc: number;
	cotaValor: number;
	cotaProc: number;
	totalValor: number;
	totalProc: number;
}

export interface IRelatorioZonas {
	ano: number | null;
	/** Mês do filtro (0 = janeiro … 11 = dezembro) */
	mes: number | null;
	anos: number[];
	linhas: IRelatorioZonaLinha[];
	totalGeral: number;
}

export interface IRelatorio {
	anoAtual: number;
	mesAtual: number;
	metaAnual: number;
	meses: string[];
	d26: IRelatorioMensal;
	hist: IRelatorioHistorico;
	/** Top 10 maiores processos por período */
	top: {
		ano: IRelatorioTop10[];
		mes: IRelatorioTop10[];
		todo: IRelatorioTop10[];
	};
	subs: IRelatorioSubprefeitura[];
	distritos: Pick<IRelatorioDistrito, 'chave' | 'nome' | 'val' | 'proc'>[];
	alertas: IRelatorioAlerta[];
	totalProcessos: number;
	/** "Outorga" na interface — inclui processos PDE e sem tipo definido */
	pde: IRelatorioPdeCota;
	cota: IRelatorioPdeCota;
	aiu: IRelatorioPdeCota;
	/**
	 * Arrecadado no ano por tipo (em milhões), mesma base do d26.real.
	 * FUNDURB = outorga + cota; AIU é arrecadado à parte (fora do FUNDURB).
	 */
	arrecadadoTipo: { outorga: number; cota: number; aiu: number };
	/**
	 * KPIs de gestão do FUNDURB (Outorga + Cota, excluindo AIU). Valores em milhões,
	 * exceto `processos`. Base consistente com d26 (capado no mês corrente).
	 */
	fundurb: {
		arrecadado: number;
		quebras: number;
		antecipacoes: number;
		/** Previsto restante nos meses futuros do ano */
		prevRestante: number;
		processos: number;
	};
}
