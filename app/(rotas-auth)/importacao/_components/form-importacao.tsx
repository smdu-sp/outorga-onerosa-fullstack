'use client';
import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { importarPlanilha } from '@/services/processos/server-functions/importar-planilha';
type Relatorio = { processosAusentes: string[]; parcelasNovas: number; valoresCorrigidos: number; processosAplicados: number; pendencias: {fonte:string; motivo:string; processo?:string; parcela?:number}[]; abasIgnoradas:string[] };
export default function FormImportacao() {
  const [arquivos,setArquivos] = useState<File[]>([]);
  const [relatorio,setRelatorio] = useState<Relatorio | null>(null);
  const [pending,startTransition] = useTransition();
  function executar(aplicar: boolean) {
    startTransition(async () => {
      try {
        const form = new FormData();
        arquivos.forEach(f => form.append('arquivos',f));
        form.set('aplicar',String(aplicar));
        setRelatorio(await importarPlanilha(form));
        toast(aplicar ? 'Reconciliação concluída. Confira o relatório.' : 'Conferência concluída.');
      } catch (e) { toast(e instanceof Error ? e.message : 'Erro ao importar.'); }
    });
  }
  return <div className="p-6 space-y-4 bg-background rounded-lg">
    <p>Importador universal de parcelas — Aprova Digital, SEI e processos físicos.</p>
    <label htmlFor="planilhas">Planilhas (.xlsx ou .xlsm)</label>
    <Input id="planilhas" type="file" multiple accept=".xlsx,.xlsm" disabled={pending} onChange={e => {setArquivos(Array.from(e.target.files ?? []));setRelatorio(null);}} />
    <p className="text-sm text-muted-foreground">As parcelas são separadas por processo, obrigação e número. Datas inválidas e fontes conflitantes são sinalizadas para revisão.</p>
    <Button disabled={pending || !arquivos.length} onClick={() => executar(false)}>{pending ? 'Processando…' : 'Conferir planilhas'}</Button>
    {relatorio && <div className="space-y-3">
      <p>{relatorio.processosAusentes.length} processos ausentes; {relatorio.parcelasNovas} parcelas novas; {relatorio.valoresCorrigidos} valores divergentes; {relatorio.pendencias.length} pendências.</p>
      <Button disabled={pending} onClick={() => executar(true)}>Importar e corrigir parcelas conferidas</Button>
      <Button variant="outline" onClick={() => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(relatorio,null,2)],{type:'application/json'}));
        const a = document.createElement('a'); a.href=url; a.download='auditoria-importacao.json'; a.click(); URL.revokeObjectURL(url);
      }}>Baixar relatório completo</Button>
      {!!relatorio.processosAplicados && <p>{relatorio.processosAplicados} processos reconciliados.</p>}
      {relatorio.pendencias.length > 0 && <details><summary>Pendências para revisão</summary><ul className="space-y-2">{relatorio.pendencias.slice(0,100).map((p,i) => <li key={i}>{p.fonte} — {p.processo} / parcela {p.parcela}: {p.motivo}</li>)}</ul>{relatorio.pendencias.length > 100 && <p>Baixe o relatório para ver todas as pendências.</p>}</details>}
      {!!relatorio.abasIgnoradas.length && <p>Abas sem layout financeiro reconhecido: {relatorio.abasIgnoradas.join(', ')}</p>}
    </div>}
  </div>;
}
