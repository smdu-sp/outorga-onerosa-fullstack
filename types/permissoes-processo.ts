/** @format */

export type IPermissoesProcesso = {
	podeVerTodos: boolean;
	podeEditarDadosIniciais: boolean;
	podeEditarParcelas: boolean;
	podeEditarMonitoramento: boolean;
	podeRecalcular: boolean;
	podeReverterAntecipacao: boolean;
	/** Usuário DEV (`Usuario.dev`) — libera o link para a tela de cálculo OODC (dev). */
	isDev: boolean;
};
