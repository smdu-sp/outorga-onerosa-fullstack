# Importação e reconciliação de parcelas

A tela `/importacao` aceita várias planilhas XLSX/XLSM juntas. Primeiro confira e baixe o relatório; depois aplique a reconciliação. Os arquivos são interpretados no servidor, com a permissão `processos_importar`.

O leitor identifica cabeçalhos, incluindo os layouts DPD, DPCI, físicos e SEI. A chave é processo + obrigação (PDE/COTA/AIU) + número da parcela. Não há filtro por ano do vencimento. Abas sem estrutura financeira são listadas no relatório.

Para uma operação com backup local e auditoria completa:

```powershell
npm run db:import-universal -- "caminho\Aprova Digital.xlsm" "caminho\Fisicos SEI.xlsx"
npm run db:import-universal -- --aplicar "caminho\Aprova Digital.xlsm" "caminho\Fisicos SEI.xlsx"
npm run test:importador
```

O comando sem `--aplicar` apenas confere. Os arquivos de saída ficam em `scripts/output/importacao-universal-<timestamp>/`, ignorados pelo Git:

- `planilhas.json`: linhas normalizadas, localização de origem e pendências.
- `auditoria.json`: processos ausentes e diferenças antes da aplicação.
- `backup.json`: processos e parcelas existentes antes de qualquer escrita.
- `aplicacao.json`: alterações aplicadas.
- `verificacao.json`: nova comparação depois de aplicar; não deve indicar novas alterações nas linhas resolvidas.

Cada processo é atualizado em uma transação. IDs de parcelas e campos fora da importação são preservados; parcelas ausentes na fonte não são excluídas. Status e total do processo são recalculados a partir de todas as parcelas existentes.

Datas textuais aceitam dia/mês/ano ou ISO, com validação do calendário. Um ano isolado nunca vira uma data. Pagamento futuro, ilegível ou incompatível com a situação não substitui o pagamento registrado no banco. Uma data exata confiável corrige a anterior; se somente o ano conhecido contradiz uma data anterior, mantém-se o ano e remove-se a precisão falsa. Fontes conflitantes e múltiplas correspondências no banco ficam pendentes. Valores sem número, datas de vencimento ausentes e identificação inválida não são completados por suposição.

Quitação sem data exata permanece identificada no relatório. Os filtros financeiros mensais e por intervalo exigem data efetiva; os anuais podem utilizar o ano de pagamento informado. Vencimento não é substituto de pagamento.

Os scripts legados `db:import-planilhas` e `db:import-outorga` têm regras diferentes; utilize `db:import-universal` para esta reconciliação financeira.
