import type { EntradaCalculoOodc, ResultadoCalculoOodc } from './tipos';

export function pendenciasCalculoOodc(entrada: EntradaCalculoOodc, resultado: ResultadoCalculoOodc): string[] {
	const pendencias: string[] = [];
	if (!entrada.idLegislacao) pendencias.push('Selecione a legislação.');
	if (resultado.vMax == null) pendencias.push('Busque o valor de referência do endereço (V_MÁXIMO). Sem ele, a OODC não pode ser calculada.');
	if (!entrada.tipologias.length) pendencias.push('Adicione pelo menos uma tipologia.');
	entrada.tipologias.forEach((t, i) => {
		if (!t.idTipologia) pendencias.push(`Selecione a tipologia #${i + 1}; para HMP, confira a faixa de área da unidade.`);
		if (!(t.terrenoM2 > 0)) pendencias.push(`Informe a parcela de terreno da tipologia #${i + 1}.`);
		if (!(t.computavelM2 > 0)) pendencias.push(`Informe a área computável da tipologia #${i + 1}.`);
		if (t.idTipologia && !resultado.tipologias[i]?.fp) pendencias.push(`Confira a macroárea/área AIU para obter o Fp da tipologia #${i + 1}.`);
	});
	return pendencias;
}
