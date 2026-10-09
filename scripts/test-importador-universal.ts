import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { dataPlanilha, valorPlanilha, lerPlanilhaUniversal } from '../lib/importador-universal';
import { dataPagamentoParcela, parcelaArrecadadaNoPeriodo } from '../lib/parcelas-utils';

assert.equal(dataPlanilha('31/02/2026'), null);
assert.equal(dataPlanilha('2026'), null);
assert.equal(dataPlanilha('03/04/2026')?.toISOString(),'2026-04-03T00:00:00.000Z');
assert.equal(dataPlanilha(46000)?.toISOString(),'2025-12-09T00:00:00.000Z');
assert.equal(valorPlanilha('R$ 1.234.567,89'),1234567.89);
assert.equal(valorPlanilha('não informado'),null);
assert.equal(valorPlanilha('1234.56'),1234.56);
const semData = {status_quitacao:true,vencimento:new Date('2025-01-15T00:00:00Z'),ano_pagamento:2026};
assert.equal(dataPagamentoParcela(semData),null);
assert.equal(parcelaArrecadadaNoPeriodo(semData,{ano:2026}),true);
assert.equal(parcelaArrecadadaNoPeriodo(semData,{ano:2025}),false);
assert.equal(parcelaArrecadadaNoPeriodo(semData,{ano:2026,mes:0}),false);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
  ['VALOR','SEI','ANO DE PAGAMENTO','VENCIMENTO','CODIGO DA GUIA'],
  [1234.56,'1020.2024/0023494-8','13/01/2025','14/01/2025',79],
]), 'Quitado - DPCI');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
  ['PROCESSO','CÓD.','PARC.','VALOR','VENCIM.','QUITAÇÃO','Situação'],
  ['1010.2023/0000049-5',7022,1,100,'01/01/2026','2026','Pago'],
  [null,null,2,100,'01/02/2026','31/02/2026','Pago'],
  ['1010.2025/0000198-3',7137,1,200,'01/12/2026','01/12/2026','Pago'],
]), 'SEI - QUITADO');
const resultado = lerPlanilhaUniversal(wb,'teste.xlsx',new Date('2026-10-08T00:00:00Z'));
assert.equal(resultado.linhas.length,4);
assert.equal(resultado.linhas[0].valor,1234.56);
assert.equal(resultado.linhas[0].data_quitacao?.toISOString(),'2025-01-13T00:00:00.000Z');
assert.equal(resultado.linhas[1].ano_pagamento,2026);
assert.equal(resultado.linhas[1].data_quitacao,null);
assert.equal(resultado.linhas[2].num_processo,'1010.2023/0000049-5');
assert.equal(resultado.linhas[2].pagamentoConfiavel,false);
assert.equal(resultado.linhas[3].data_quitacao,null);
assert.equal(resultado.linhas[3].pagamentoConfiavel,false);
assert.equal(resultado.linhas[3].obrigacao,'COTA');
console.log('Testes do importador universal passaram.');
