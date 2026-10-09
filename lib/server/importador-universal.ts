import { Prisma, PrismaClient } from '@prisma/client';
import { LinhaImportacao, PendenciaImportacao } from '../importador-universal';
import { classificarAntecipacao } from '../antecipacao';
import { recalcularStatusPagamento } from '../parcelas-utils';

/** Preserva IDs e parcelas ausentes na fonte. Cada processo é reconciliado atomicamente. */
export async function reconciliarParcelas(db: PrismaClient, linhas: LinhaImportacao[], aplicar = false, usuarioId?: string) {
  const pendencias: PendenciaImportacao[] = [];
  const grupos = new Map<string, LinhaImportacao[]>();
  for (const linha of linhas) grupos.set(linha.num_processo, [...(grupos.get(linha.num_processo) ?? []), linha]);
  const relatorio = { processosAusentes: [] as string[], parcelasNovas: 0, valoresCorrigidos: 0, processosAplicados: 0, pendencias,
    alteracoes: [] as { processo: string; parcela: number; obrigacao: string; anterior: unknown; novo: unknown }[] };
  for (const [numero, entradas] of grupos) {
    const unicas = new Map<string, LinhaImportacao>();
    const bloqueadas = new Set<string>();
    for (const linha of entradas) {
      const key = `${linha.obrigacao}/${linha.num_parcela}`;
      const anterior = unicas.get(key);
      if (anterior && ['valor','vencimento','status_quitacao','quebra','data_quitacao','ano_pagamento'].some(c => JSON.stringify(anterior[c as keyof LinhaImportacao]) !== JSON.stringify(linha[c as keyof LinhaImportacao]))) {
        bloqueadas.add(key); pendencias.push({fonte: `${anterior.fonte}; ${linha.fonte}`, processo:numero, parcela:linha.num_parcela, motivo:'Fontes conflitantes para a mesma obrigação/parcela'});
      }
      unicas.set(key, linha);
    }
    const executar = async (tx: Prisma.TransactionClient) => {
      let processo = await tx.processo.findUnique({where:{num_processo:numero}, include:{parcelas:true}});
      if (!processo) relatorio.processosAusentes.push(numero);
      const validas = [...unicas].filter(([key]) => !bloqueadas.has(key)).map(([,l]) => l);
      if (!validas.length) return;
      if (!processo && aplicar) processo = await tx.processo.create({data:{num_processo:numero, tipo:validas[0].obrigacao, data_entrada:validas.find(l => l.data_entrada)?.data_entrada, criado_por:usuarioId},include:{parcelas:true}});
      for (const linha of validas) {
        const candidatas = processo?.parcelas.filter(p => p.num_parcela === linha.num_parcela && (p.obrigacao === linha.obrigacao || p.obrigacao == null && processo?.tipo === linha.obrigacao)) ?? [];
        if (candidatas.length > 1) { pendencias.push({fonte:linha.fonte,processo:numero,parcela:linha.num_parcela,motivo:'Mais de uma parcela correspondente no banco'}); continue; }
        const anterior = candidatas[0];
        // Data desconhecida na planilha não apaga uma data existente no sistema.
        let pagamento = linha.pagamentoConfiavel && linha.status_quitacao && linha.data_quitacao ? linha.data_quitacao : anterior?.data_quitacao ?? null;
        if (linha.pagamentoConfiavel && !linha.data_quitacao && linha.ano_pagamento != null && pagamento && pagamento.getUTCFullYear() !== linha.ano_pagamento) {
          pendencias.push({fonte:linha.fonte,processo:numero,parcela:linha.num_parcela,motivo:'Data existente diverge do ano da fonte; manter somente o ano conhecido'});
          pagamento = null;
        }
        const status = linha.pagamentoConfiavel ? linha.status_quitacao : anterior?.status_quitacao ?? false;
        const quebra = linha.pagamentoConfiavel ? linha.quebra : anterior?.quebra ?? false;
        const classificacao = status && pagamento ? classificarAntecipacao(linha.vencimento, pagamento) : {antecipada:false,diasAntecipacao:null};
        const data = {obrigacao:linha.obrigacao,num_parcela:linha.num_parcela,valor:linha.valor,vencimento:linha.vencimento,cpf_cnpj:linha.cpf_cnpj ?? anterior?.cpf_cnpj ?? null,
          status_quitacao:status,quebra,data_quitacao:status ? pagamento : null,
          ano_pagamento:status ? pagamento?.getUTCFullYear() ?? linha.ano_pagamento ?? anterior?.ano_pagamento ?? null : null,
          antecipada:classificacao.antecipada,dias_antecipacao:classificacao.antecipada ? classificacao.diasAntecipacao : null};
        const mudou = !anterior || Object.entries(data).some(([key,value]) => JSON.stringify(anterior[key as keyof typeof anterior]) !== JSON.stringify(value));
        if (!mudou) continue;
        if (!anterior) relatorio.parcelasNovas++;
        else if (Math.round(anterior.valor * 100) !== Math.round(data.valor * 100)) relatorio.valoresCorrigidos++;
        relatorio.alteracoes.push({processo:numero,parcela:linha.num_parcela,obrigacao:linha.obrigacao,anterior:anterior ?? null,novo:data});
        if (aplicar && processo) {
          if (anterior) await tx.parcela.update({where:{id:anterior.id},data});
          else await tx.parcela.create({data:{...data,processo_id:processo.id}});
        }
      }
      if (aplicar && processo) {
        const parcelas = await tx.parcela.findMany({where:{processo_id:processo.id}});
        await tx.processo.update({where:{id:processo.id},data:{status_pagamento:recalcularStatusPagamento(parcelas),valor_total_parcelas:parcelas.reduce((s,p) => s + Math.round(p.valor*100),0)/100}});
        relatorio.processosAplicados++;
      }
    };
    if (aplicar) await db.$transaction(executar, {timeout:30000});
    else await executar(db);
  }
  return relatorio;
}
