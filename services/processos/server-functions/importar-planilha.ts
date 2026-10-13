'use server';
import ExcelJS from 'exceljs';
import { requirePermissao } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { lerPlanilhaUniversal } from '@/lib/importador-universal';
import { reconciliarParcelas } from '@/lib/server/importador-universal';
import { revalidatePath } from 'next/cache';

export async function importarPlanilha(form: FormData) {
  const session = await requirePermissao('processos_importar');
  const arquivos = form.getAll('arquivos');
  if (!arquivos.length) throw new Error('Selecione ao menos uma planilha.');
  const hoje = new Date(`${new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date())}T00:00:00Z`);
  const leituras = [];
  for (const arquivo of arquivos) {
    if (!(arquivo instanceof File) || !/\.(xlsx|xlsm)$/i.test(arquivo.name)) throw new Error('Arquivo inválido.');
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/node duplicado (mssql/tedious vs. raiz) colide no tipo Buffer.
    await wb.xlsx.load(Buffer.from(await arquivo.arrayBuffer()) as any);
    leituras.push(lerPlanilhaUniversal(wb,arquivo.name,hoje));
  }
  const aplicar = form.get('aplicar') === 'true';
  const resultado = await reconciliarParcelas(prisma,leituras.flatMap(l => l.linhas),aplicar,session.usuario.sub);
  if (aplicar) { revalidatePath('/processos'); revalidatePath('/importacao'); }
  return JSON.parse(JSON.stringify({...resultado,pendencias:[...leituras.flatMap(l => l.pendencias),...resultado.pendencias],abasIgnoradas:leituras.flatMap(l => l.abasIgnoradas)}));
}
