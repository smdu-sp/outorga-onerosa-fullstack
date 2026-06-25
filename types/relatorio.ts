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
}

export interface IRelatorioMesSemana {
	label: string;
	previsto: number;
	realizado: number;
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
	anoAnterior: { previsto: number; realizado: number };
	countStatus: { pagoPrazo: number; pagoAtraso: number; aberto: number; quebra: number };
}

export interface IRelatorio {
	anoAtual: number;
	mesAtual: number;
	metaAnual: number;
	meses: string[];
	d26: IRelatorioMensal;
	hist: IRelatorioHistorico;
	top: IRelatorioTop10[];
	subs: IRelatorioSubprefeitura[];
	distritos: Pick<IRelatorioDistrito, 'chave' | 'nome' | 'val' | 'proc'>[];
	alertas: IRelatorioAlerta[];
	totalProcessos: number;
	pde: IRelatorioPdeCota;
	cota: IRelatorioPdeCota;
}
