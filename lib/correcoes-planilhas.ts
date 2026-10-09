/** Correcoes de vencimento confirmadas pelo usuario em 09/10/2026.
 * Estas guias foram preenchidas em MM/DD: 10/02 significa 2 de outubro.
 * A regra e pontual; outras datas seguem DD/MM normalmente.
 */
export function corrigirVencimentoConfirmado(
  processo: string, obrigacao: string | undefined, parcela: number, data: Date | null,
): Date | null {
  const chaves = new Set([
    '1020.2026/0037109-4/COTA/1',
    '1020.2026/0037109-4/PDE/1',
    '1020.2026/0012385-6/PDE/1',
  ]);
  if (data?.toISOString().slice(0,10) === '2026-02-10' && chaves.has(`${processo}/${obrigacao}/${parcela}`)) {
    return new Date('2026-10-02T00:00:00Z');
  }
  return data;
}
