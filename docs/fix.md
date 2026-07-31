# Ajustes no módulo de Processos / Fundurb

## 1. Remover aba "Situação"

- Remover completamente a aba **Situação**.
- O campo **Origem** deve ser movido para a seção **Dados do Processo**.
- Renomear o campo para **Sistema de origem**.

---

## 2. Exibir valor da cota no resumo do processo

No painel superior da página do processo (onde atualmente são exibidos):

- Processo SEI
- Tipo
- Status
- Valor Total
- Valor Devido
- Data de Entrada

adicionar também:

- **Valor da Cota**

Exemplo:

- Processo SEI
- Tipo
- Status
- Valor Total
- Valor da Outorga
- **Valor da Cota**
- Valor Devido
- Data de Entrada

---

## 3. Atualizar os tipos de processo

O campo **Tipo** deve aceitar apenas os seguintes valores:

- Cota
- Outorga
- Outorga/Cota
- AIU

---

## 4. Exibir data de autuação

Adicionar o campo **Data de Autuação** na seção **Dados do Processo**.

Esse valor deve ser obtido diretamente da resposta da API:

```json
{
  "processo": {
    "dataAutuacao": "yyyy-mm-dd"
  }
}
```

---

## 5. Melhorar informações da localização do lote

Consumir os seguintes dados retornados pela API:

```json
{
  "processo": {
    "sqlIncra": "...",
    "codlog": "..."
  }
}
```

### Dados do Processo

Adicionar:

- SQL/INCRA (inteiro)
- SQL formatado

### Localização do Lote

A partir do SQL/INCRA, preencher automaticamente:

- Setor
- Quadra
- Lote

Também adicionar:

- Código do Logradouro

Toda essa informação deve ser preenchida automaticamente após a consulta do processo.

---

## 6. Inclusão de multa durante o cadastro

Na tela de **Novo Processo**, após o cálculo da Outorga/Cota, adicionar um botão:

**Incluir Multa**

Ao clicar:

- abrir um modal (ou campo expansível);
- permitir informar o valor da multa;
- salvar esse valor vinculado ao processo.

---

## 7. Nova aba "Multa"

Criar uma nova aba abaixo da seção de parcelas chamada:

**Multa**

Ela deve funcionar de maneira semelhante à aba de parcelas.

Funcionalidades:

- visualizar o valor da multa;
- editar o valor;
- marcar como paga;
- registrar data do pagamento;
- permitir futuras alterações quando necessário.

---

## 8. Integração da multa ao fluxo financeiro do Fundurb

A multa passa a compor a arrecadação do Fundurb juntamente com:

- Outorga
- Cota

Sempre que uma multa for marcada como paga:

- registrar como entrada financeira;
- considerar nos totais arrecadados;
- incluir nos relatórios e dashboards financeiros;
- contabilizar juntamente com os demais recebimentos do processo.

---

# Resumo das alterações

- Remover a aba **Situação**.
- Renomear **Origem** para **Sistema de origem**.
- Exibir **Valor da Cota** no cabeçalho do processo.
- Atualizar os tipos permitidos do processo.
- Adicionar **Data de Autuação**.
- Importar e exibir SQL/INCRA, SQL formatado, Setor, Quadra, Lote e Código do Logradouro.
- Permitir inclusão de multa durante o cadastro do processo.
- Criar uma aba específica para gerenciamento da multa.
- Integrar a multa ao fluxo financeiro e aos indicadores do Fundurb.