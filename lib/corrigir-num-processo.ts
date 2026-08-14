/**
 * Correções pontuais de nº de processo conhecidos na planilha DEUSO.
 *
 * O Excel às vezes auto-incrementa o dígito verificador ao arrastar a célula
 * entre linhas de parcela do mesmo processo — cada linha vira um "processo"
 * fantasma. Fonte: equipe DEUSO / consolidação 1010.2019/0001812-5.
 */
const CORRECOES_NUM_PROCESSO: Record<string, string> = {
  "1010.2019/0001812-6": "1010.2019/0001812-5",
  "1010.2019/0001812-7": "1010.2019/0001812-5",
  "1010.2019/0001812-8": "1010.2019/0001812-5",
  "1010.2019/0001812-9": "1010.2019/0001812-5",
  "1010.2019/0001812-10": "1010.2019/0001812-5",
  "1010.2019/0001812-11": "1010.2019/0001812-5",
  "1010.2019/0001812-12": "1010.2019/0001812-5",
  "1010.2019/0001812-13": "1010.2019/0001812-5",
  "1010.2019/0001812-14": "1010.2019/0001812-5",
};

/** Aplica alias conhecido; devolve o mesmo texto se não houver correção. */
export function corrigirNumProcesso(num: string): string {
  return CORRECOES_NUM_PROCESSO[num] ?? num;
}
