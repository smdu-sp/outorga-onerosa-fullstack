# Mapeamento: Planilha SERVIN → Modelo de Dados

Documento de mapeamento coluna a coluna da planilha de Controle de Processos SERVIN para o modelo do módulo **Gestão de Processos de Licenciamento**.

Alinhado a [`proposta_gestao_processos_licenciamento.md`](./proposta_gestao_processos_licenciamento.md).

## Fontes

| Fonte | Arquivo |
|-------|---------|
| Planilha piloto | `Controle de Processos SERVIN 2025 d_16 04 2026.xlsx` |
| Descritivo | `Descritivo da Planilha de Controle de processos SERVIN d_16 04 2026.docx` |
| Coordenadoria do piloto | SERVIN |

---

## 1. Classificação das abas

| Aba | Classificação | Destino no modelo |
|-----|---------------|-------------------|
| Processos Ativos | **Dado** (fonte principal) | `ProcessoLicenciamento` + relações |
| Processos Encerrados | **Visão** | Mesma entidade; `status_ciclo = ENCERRADO` |
| Eventos | **Dado** | `Evento` (`categoria = TECNICO`) |
| Eventos Administrativos | **Dado** | `Evento` (`categoria = ADMINISTRATIVO`) |
| Fisicos | **Visão / subconjunto** | Mesma entidade; `tipo_sistema = FISICO` (+ campos extras) |
| Ofícios | **Dado** | `Oficio` (1:N com processo) |
| Multiplos SQLs | **Descartável** | Absorvido por `ProcessoImovel` (1:N) |
| TJ-SP | **Visão** | Filtro por categoria `TJ-SP` |
| Hospitais | **Visão** | Filtro por categorias Hospital / UBS / UPA |
| CEUs | **Visão** | Filtro por categoria `CEU` |
| SESCs (inserindo dados) | **Visão** | Filtro por categoria `SESC` |
| Arquivados | **Dado** | `Arquivamento` (por processo + container) |
| Lista Susp Eventos | **Cadastro auxiliar** | `TipoEvento` (técnicos) |
| EX. Ativos | **Documentação** | Legenda de preenchimento; não importa |
| EX. Eventos | **Documentação** | Legenda de preenchimento; não importa |

---

## 2. Premissas de mapeamento

1. **`ProcessoLicenciamento`** é a entidade central; **não** reutilizar a tabela `processos` (Outorga).
2. **Coordenadoria** é obrigatória; no piloto todos os registros importados recebem `SERVIN`.
3. Colunas “última …” (técnico, datas de distribuição, situação) são **espelho do estado atual**; o histórico fica em `Distribuicao`, `Evento` e auditoria.
4. SQL/interessado repetidos em Eventos são **desnormalização da planilha**; no sistema vêm do processo.
5. Flag **OODC = Sim** (e eventos de Outorga) indicam candidato a **vínculo opcional** com `Processo` (Outorga).
6. Origens possíveis por campo:
   - **Manual** — preenchido no módulo
   - **Integração** — SEI / AD / GeoSampa / outros (quando disponível)
   - **Derivado** — calculado ou copiado de outro registro
   - **Importação** — vem da planilha no piloto

---

## 3. Processos Ativos → modelo

Cabeçalhos das linhas 1–3 da aba. Coluna Excel ≈ índice 1-based.

### 3.1 Identificação e tramitação

| Col | Coluna na planilha | Entidade | Campo proposto | Card. | Origem |
|-----|--------------------|----------|----------------|-------|--------|
| 1 | Controle | — | Ignorar (sem dados / controle interno da planilha) | — | — |
| 2 | Protocolo | `ProcessoLicenciamento` | `protocolo` | 1 | Manual / Integração (AD) |
| 3 | Processo | `ProcessoLicenciamento` | `num_processo` (chave de negócio) | 1 | Manual / Integração (SEI/AD) |
| 4 | Sistema | `ProcessoLicenciamento` | `tipo_sistema` (`SEI` / `FISICO` / `AD`) | 1 | Manual / Integração |
| 5 | Prioritário | `ProcessoLicenciamento` | `prioritario` (bool) | 1 | Manual |
| 6 | Divisão | `ProcessoLicenciamento` | `divisao_id` → cadastro `Divisao` | 1 | Manual |
| 7 | Assunto | `ProcessoLicenciamento` | `assunto_id` → cadastro `Assunto` | 1 | Manual / Integração |
| 8 | Número do Processo ou Alvará Relacionado | `ProcessoLicenciamento` | `processo_relacionado` (texto) ou FK futura | 0..1 | Manual |
| 12 | Equipamento Público | `ProcessoLicenciamento` | `equipamento_publico` (bool/texto) | 0..1 | Manual |
| 14 | Data de Autuação | `ProcessoLicenciamento` | `data_autuacao` | 0..1 | Manual / Integração |
| 15 | Data de envio para a Coordenadoria | `ProcessoLicenciamento` | `data_envio_coordenadoria` | 0..1 | Manual (pouco usada) |
| 16 | Data da última distribuição p/ diretoria | `ProcessoLicenciamento` + `Distribuicao` | Espelho: `data_ult_dist_diretoria`; histórico em `Distribuicao` | 0..1 | Derivado / Manual |
| 17 | Data da última distribuição p/ o técnico | idem | Espelho: `data_ult_dist_tecnico` | 0..1 | Derivado / Manual |
| 18 | Técnico | `ProcessoLicenciamento` | `tecnico_atual_id` → `Usuario` | 0..1 | Manual; mudança gera evento automático + `Distribuicao` |
| 19 | Situação Atual | `ProcessoLicenciamento` | `situacao_id` → cadastro `Situacao` | 1 | Manual / Derivado de evento |
| 20 | Data de Despacho DOC | `ProcessoLicenciamento` | `data_despacho_doc` | 0..1 | Manual |
| 21 | Instância | `ProcessoLicenciamento` | `instancia` (ex.: inicial, recurso) | 0..1 | Manual |
| 22 | Observação | `ProcessoLicenciamento` | `observacao` | 0..1 | Manual |
| — | (implícito) Ativo vs Encerrado | `ProcessoLicenciamento` | `status_ciclo` (`ATIVO` / `ENCERRADO`) | 1 | Derivado da situação |
| — | (piloto) Coordenadoria | `ProcessoLicenciamento` | `coordenadoria_id` = SERVIN | 1 | Fixo na importação |

### 3.2 Imóveis / SQLs / endereço

| Col | Coluna na planilha | Entidade | Campo proposto | Card. | Origem |
|-----|--------------------|----------|----------------|-------|--------|
| 9 | SQL/INCRA/ÁREA PÚBLICA — Principal | `ProcessoImovel` | `identificador` + `tipo = PRINCIPAL` | 1..N | Manual / Integração |
| 10 | Complementares | `ProcessoImovel` | `identificador` + `tipo = COMPLEMENTAR` (parse lista) | 0..N | Manual; + aba Multiplos SQLs |
| 11 | Endereço | `ProcessoImovel` ou `ProcessoEndereco` | logradouro, número, complemento, CEP | 1..N | Manual / Integração |

**Nota:** um processo pode ter N SQLs e N frentes. A aba **Multiplos SQLs** deixa de existir; cada SQL vira uma linha em `ProcessoImovel`.

### 3.3 Interessados

| Col | Coluna na planilha | Entidade | Campo proposto | Card. | Origem |
|-----|--------------------|----------|----------------|-------|--------|
| 13 | Interessado (proprietário principal) | `ProcessoInteressado` | `nome`, `tipo_vinculo = PRINCIPAL` | 1..N | Manual / Integração |

CPF/CNPJ não aparece de forma consistente na planilha; campo opcional no modelo.

### 3.4 Incidências / taxas / legislação especial

Modelo sugerido: tabela `ProcessoIncidencia` (processo + tipo + flag + valor opcional) **ou** campos booleanos + valores no processo. Preferência: **tabela tipada** para não engessar novas incidências.

| Col | Coluna na planilha | Tipo de incidência | Campos | Origem |
|-----|--------------------|--------------------|--------|--------|
| 23–24 | Isenção de taxas + Valor | `ISENCAO_TAXAS` | `flag`, `valor` | Manual |
| 25 | Quota Ambiental | `QUOTA_AMBIENTAL` | `flag` | Manual |
| 26–27 | OODC + Valor | `OODC` | `flag`, `valor` | Manual; ver §6 |
| 28–29 | CEPAC + Valor | `CEPAC` | `flag`, `valor` | Manual |
| 30–31 | Quota de Solidariedade + Valor | `QUOTA_SOLIDARIEDADE` | `flag`, `valor` | Manual |
| 32 | Doação de Calçada | `DOACAO_CALCADA` | `flag` | Manual |
| 33 | Fruição Pública | `FRUICAO_PUBLICA` | `flag` | Manual |
| 34 | Fachada Ativa | `FACHADA_ATIVA` | `flag` | Manual |
| 35 | Plano de Intervenção Urbana | `PIU` | `flag` | Manual |
| 36 | Área de Intervenção Urbana | `AIU` | `flag` | Manual |
| 37 | Operação Urbana | `OPERACAO_URBANA` | `flag` | Manual |
| 38 | Outros | `OUTROS` | `flag` / texto | Manual |
| 39–42 | Emissão de Certificado de Irregularidade + Data DOC + Nº + Obs | `CERTIFICADO_IRREGULARIDADE` | `flag`, `data_doc`, `numero_documento`, `observacao` | Manual |

### 3.5 Informações complementares / território / base legal

| Col | Coluna na planilha | Entidade | Campo proposto | Card. | Origem |
|-----|--------------------|----------|----------------|-------|--------|
| 44 | Terreno (Escr.) m² | `ProcessoLicenciamento` | `area_terreno_m2` | 0..1 | Manual / Integração |
| 45 | Construção Inicial | `ProcessoLicenciamento` | `area_construcao_inicial_m2` | 0..1 | Manual |
| 46 | Construção final | `ProcessoLicenciamento` | `area_construcao_final_m2` | 0..1 | Manual |
| 47 | Zona | `ProcessoLicenciamento` | `zona` | 0..1 | Manual / GeoSampa |
| 48 | Categoria de Uso / Atividade | `ProcessoLicenciamento` | `categoria_uso` | 0..1 | Manual |
| 49 | Descrição | `ProcessoLicenciamento` | `descricao_uso` | 0..1 | Manual |
| 50 | Subprefeitura | `ProcessoLicenciamento` | `subprefeitura` | 0..1 | Manual / GeoSampa |
| 51 | PDE (Lei nº / data) | `ProcessoLicenciamento` | `base_legal_pde` | 0..1 | Manual |
| 52 | LPUOS (Lei nº / data) | `ProcessoLicenciamento` | `base_legal_lpuos` | 0..1 | Manual |
| 53 | COE (Lei nº / data) | `ProcessoLicenciamento` | `base_legal_coe` | 0..1 | Manual |
| 54 | Legislação específica | `ProcessoLicenciamento` | `legislacao_especifica` | 0..1 | Manual |

---

## 4. Processos Encerrados

Mesmas colunas conceituais de Ativos (subconjunto / ordem ligeiramente diferente).

| Tratamento | Detalhe |
|------------|---------|
| Entidade | `ProcessoLicenciamento` |
| Diferença | `status_ciclo = ENCERRADO` |
| Gatilho sugerido | Situação `Deferido Encerrado` ou `Indeferido e Encerrado` (e equivalentes) |
| Importação | Unificar com Ativos; não criar tabela separada |

---

## 5. Eventos (técnicos)

Estrutura conforme **EX. Eventos** / dados da aba **Eventos**:

| Coluna planilha | Entidade | Campo | Observação |
|-----------------|----------|-------|------------|
| ID | `Evento` | `id` / ignore | Controle da planilha |
| Processo | `Evento` | `processo_licenciamento_id` | Obrigatório |
| SQL/INCRA | — | Não persistir no evento | Redundante; ler do processo |
| Interessado | — | Não persistir no evento | Redundante |
| Técnico | `Evento` | `tecnico_id` | |
| Tipo de Evento | `Evento` | `tipo_evento_id` | Domínio §8 |
| Data Início | `Evento` | `data_inicio` | |
| Data Término | `Evento` | `data_termino` | Nullable se em andamento |
| Descrição/Observação | `Evento` | `descricao`, `observacao` | |
| — | `Evento` | `categoria = TECNICO` | Fixo nesta aba |

**Regra de negócio (do descritivo):** ao registrar/alterar evento que defina situação, atualizar `ProcessoLicenciamento.situacao_id` (hoje feito à mão entre abas).

---

## 6. Eventos Administrativos

Mesma estrutura de Eventos, com:

| Campo | Valor |
|-------|--------|
| `categoria` | `ADMINISTRATIVO` |
| `tipo_evento_id` | Domínio administrativo (§8) |

Tipos distintos dos técnicos (Agendamento, Recebimento, Arquivamento, etc.).

---

## 7. Físicos

| Coluna planilha | Entidade | Campo |
|-----------------|----------|-------|
| Processo | `ProcessoLicenciamento` | `num_processo` |
| (constante “Fisico”) | | `tipo_sistema = FISICO` |
| Divisão | | `divisao_id` |
| Endereço | `ProcessoImovel` / endereço | |
| Área terreno | | `area_terreno_m2` |
| Área total | | `area_construcao_final_m2` (ou campo `area_total_m2`) |
| documento | | `documento_referencia` (opcional) |
| tecnico | | `tecnico_atual_id` |

Não é entidade separada: é visão filtrada + eventual formulário simplificado de cadastro.

---

## 8. Ofícios

| Coluna planilha | Entidade `Oficio` | Campo |
|-----------------|-------------------|-------|
| Número | | `numero` (ex.: `001/SERVIN`) |
| Processo | | `processo_licenciamento_id` |
| E-mail Enviado | | `data_email_enviado` |
| Recebimento de Resposta | | `data_recebimento_resposta` |
| Encerrado | | `data_encerramento` / flag |
| Técnico | | `tecnico_id` |
| Interessado | | `interessado_nome` (texto; ou FK se já cadastrado) |
| Observação | | `observacao` |

Cardinalidade: processo 1 → ofícios 0..N.

---

## 9. Multiplos SQLs

| Planilha | Modelo |
|----------|--------|
| Protocolo/processo + lista de SQLs em texto | N linhas em `ProcessoImovel` (`tipo = COMPLEMENTAR` ou conforme regra) |
| Aba | **Não migrar como tabela**; usar só na importação para expandir SQLs |

---

## 10. Visões de monitoramento (categorias)

| Aba | Categoria(s) SERVIN | Colunas extras típicas → onde vão |
|-----|---------------------|-----------------------------------|
| TJ-SP | `TJ-SP` | Unidade, descrição, status, última movimentação → processo + eventos/obs; tag em `ProcessoCategoria` |
| Hospitais | `HOSPITAL`, `UBS`, `UPA` (campo Tipo da aba) | Local, despacho, observação → processo; técnico/situação já no núcleo |
| CEUs | `CEU` | Unidade, notas, relatório → observação / campos livres / eventos |
| SESCs | `SESC` | Unidade, descrição, status, movimentação → idem |

Cadastro: `Categoria` com `coordenadoria_id` (escopo SERVIN no piloto).  
Relação N:N: `ProcessoCategoria`.

Atualizações nas abas Ativos/Eventos **não** precisam ser replicadas: a visão é consulta filtrada.

---

## 11. Arquivados

A aba tem dois níveis:

1. **Resumo por container** (totais de processos/volumes/caixas) — útil como dashboard derivado, não como fonte primária.
2. **Lista por processo** (a partir da linha ~11): Processo, Divisão, Qtd volumes, Qtd caixas, agrupados por container.

| Dado planilha | Entidade `Arquivamento` |
|---------------|-------------------------|
| Processo | `processo_licenciamento_id` |
| Divisão | pode espelhar divisão do processo |
| Container | `container` |
| Quantidade de volumes | `quantidade_volumes` |
| Quantidade de caixas | `quantidade_caixas` |
| (não há na planilha) posição/caixa individual | campos opcionais `caixa`, `posicao`, `local`, `data_arquivamento`, `observacao` |

---

## 12. Modelo-alvo consolidado

``` text
coordenadoria
divisao                 (escopo por coordenadoria)
assunto
situacao                (escopo global e/ou por coordenadoria)
tipo_evento             (categoria TECNICO | ADMINISTRATIVO; escopo)
categoria               (monitoramento; por coordenadoria)
usuario                 (técnicos / gestores)

processo_licenciamento
  ├── coordenadoria_id          (obrigatório)
  ├── divisao_id
  ├── assunto_id
  ├── situacao_id
  ├── tecnico_atual_id
  ├── status_ciclo              ATIVO | ENCERRADO
  ├── tipo_sistema              SEI | FISICO | AD
  ├── num_processo, protocolo, …
  ├── datas / instância / observação / áreas / bases legais
  ├── processo_imovel[]
  ├── processo_interessado[]
  ├── processo_incidencia[]
  ├── processo_categoria[]
  ├── distribuicao[]
  ├── evento[]
  ├── oficio[]
  ├── arquivamento?
  └── processo_outorga_id?      → Processo (tabela Outorga existente)

evento
  ├── processo_licenciamento_id
  ├── tipo_evento_id
  ├── categoria                 TECNICO | ADMINISTRATIVO | AUTOMATICO
  ├── tecnico_id
  ├── data_inicio, data_termino
  └── descricao, observacao

distribuicao
  ├── processo_licenciamento_id
  ├── tipo                      DIRETORIA | TECNICO
  ├── destino_id / tecnico_id
  ├── data_inicio, data_fim
  └── usuario_responsavel

auditoria_processo
  └── data, usuario, tipo, valor_anterior, valor_novo, processo_id
```

### Relação com Outorga

``` text
ProcessoLicenciamento ──(0..1)──> Processo (Outorga / prisma atual)
```

Critérios para sugerir ou criar vínculo (importação / UI):

- Incidência `OODC = Sim`
- Tipo de evento `Aguarda pagamento - Outorga Onerosa`
- Tipo de evento `Comunique-se - Outorga Onerosa`
- Match por `num_processo` já existente em `processos`

---

## 13. Domínios iniciais

### 13.1 Tipos de evento técnicos (`Lista Susp Eventos`)

- Aguarda aceite
- Aguarda pagamento inicial
- Aguarda pagamento complementar
- Aguarda pagamento - Outorga Onerosa
- Aguarda pagamento - CEPAC
- Aguarda pagamento - Cota de Solidariedade
- Aguarda - distribuição para Diretoria
- Aguarda - distribuição para Técnico
- Análise
- Comunique-se
- Comunique-se complementar
- Comunique-se - Outorga Onerosa
- Comunique-se - CEPAC
- Comunique-se - Cota de Solidariedade
- Comunique-se - Fruição Pública
- Comunique-se - Doação de Calçada
- Consulta - CASE/ BDT
- Consulta - ATAJ
- Consulta - ATECC
- Consulta - DEUSO
- Consulta - CEUSO
- Consulta - CTLU
- Consulta - CAIEPS
- Consulta - CAEHIS
- Consulta - SP Urbanismo
- Consulta - PGM
- Consulta - SIURB/ PROJ 004
- Consulta - SIURB/ PROJ 3
- Consulta - SIURB/ PROJ 4
- Consulta - SVMA
- Consulta - SMC/ CONPRESP
- Consulta - SMPED/ CPA
- Consulta - SMT/ CET
- Consulta - SMSUB
- Consulta - DESAP
- Consulta - SF
- Consulta - IPHAN
- Consulta - CONDEPHAAT
- Consulta - SMA/ CETESB
- Consulta - DER/ DENIT
- Consulta - COMAER
- Encaminhado para CAEPP
- Encaminhado para CAP
- Aguarda documento interessado
- Proposta de Deferimento
- Proposta de Indeferimento
- Aguardando publicação
- Indeferido
- Indeferido e Encerrado
- Deferido
- Deferido Encerrado
- Para fiscalização da Subprefeitura
- Para subprefeitura competente
- Aguardando Recurso 1ª instância
- Aguardando Recurso 2ª instância
- Aguardando Recurso 3ª instância
- Aguarda Retorno para Encerramento
- Arquivado
- Atendimento ao Público
- Relatório Técnico

Alguns tipos funcionam também como **situação atual** do processo (ex.: Análise, Comunique-se, Deferido Encerrado). Na modelagem: `Situacao` pode compartilhar códigos com `TipoEvento` ou haver mapeamento tipo→situação.

### 13.2 Tipos de evento administrativos

- Agendamento
- Atendimento ao Público
- Recebimento de Processos
- Tramitação de Processos
- Juntada de Documentação
- Conferência de Conteúdo
- Encaminhamentos
- Arquivamento
- Controle de Processos
- Controle de Bens Patrimoniais
- Gestão de Materiais
- Consultas ao DOC
- Comunicações

### 13.3 Categorias de monitoramento (piloto SERVIN)

| Código | Origem na planilha |
|--------|--------------------|
| `HOSPITAL` | Hospitais (Tipo) |
| `UBS` | Hospitais (Tipo) |
| `UPA` | Hospitais (Tipo) |
| `CEU` | CEUs |
| `SESC` | SESCs |
| `TJ-SP` | TJ-SP |

Outras coordenadorias cadastram as próprias categorias.

### 13.4 Sistemas / tipo_sistema

Valores observados: `AD`, `Fisico`, (SEI implícito em numeração). Normalizar para: `AD` | `FISICO` | `SEI`.

Sistemas citados no descritivo só para tramitação/admin (não análise): SIMPROC, SISACOE, SISSEL — fora do núcleo de análise; registrar depois se necessário.

---

## 14. Pontos de vínculo com Outorga

| Sinal na planilha | Ação sugerida no sistema |
|-------------------|--------------------------|
| Incidência OODC = Sim (+ valor) | Marcar incidência; oferecer vínculo/criação de `Processo` Outorga |
| Evento “Aguarda pagamento - Outorga Onerosa” | Situação operacional; alertar se sem vínculo OODC |
| Evento “Comunique-se - Outorga Onerosa” | Idem |
| `num_processo` já em `processos` | Sugerir vínculo automático na importação |
| Encaminhado para CAP / Consulta - DEUSO | Fluxo de negócio Outorga; não duplicar parcelas aqui |

O módulo de licenciamento **não** armazena parcelas nem `status_pagamento`; isso permanece no módulo de Outorga.

---

## 15. Pendências e ambiguidades

1. **Situação vs tipo de evento:** a planilha usa a mesma lista para ambos em muitos casos. Definir se `Situacao` é subconjunto de `TipoEvento` ou cadastro separado com mapeamento.
2. **Datas inconsistentes** nos Eventos (ex.: término em 1936, serial Excel inválido) — sanitizar na importação.
3. **Interessado único** na planilha vs múltiplos proprietários no descritivo — modelo 1:N; importação cria um registro PRINCIPAL.
4. **Endereço único** vs várias frentes — modelo 1:N; importação começa com um endereço.
5. **Complementares** às vezes concatenados com hífen/vírgula — parser robusto na importação.
6. **Arquivados:** posição física fina (caixa/posição na estante) não está padronizada; só container + volumes/caixas por processo.
7. **Colunas pouco preenchidas** (envio à coordenadoria, certificado de irregularidade, PIU/AIU) — manter no modelo, opcionais.
8. **Valor OODC na planilha** não substitui `valor_total_parcelas` da Outorga (regra de ouro do domínio OODC).
9. **Permissões por divisão** (DSIGP, DSIMP, SERVIN-G etc.) — confirmar se filtro é só coordenadoria ou também divisão.
10. **Hospitais Tipo** mistura equipamentos; validar lista completa de tipos na aba antes do seed de categorias.
11. **Processo relacionado / alvará** — hoje texto livre; avaliar vínculo processo–processo numa fase posterior.
12. Integrações reais (SEI, AD, PLANURB/STEL, GeoSampa) — mapear campo a campo em etapa de integração, não bloqueante para o DER.

---

## 16. Ordem sugerida para a próxima etapa técnica

1. DER / Prisma das entidades deste documento (sem UI).
2. Seed: coordenadoria SERVIN, tipos de evento, situações, categorias piloto.
3. Script de importação piloto: Ativos + Encerrados → `ProcessoLicenciamento`; Eventos; Ofícios; Arquivados; tags de monitoramento.
4. Match opcional `num_processo` × tabela `processos` (Outorga).
5. Protótipo de tela: página do processo + timeline de eventos.

---

## 17. Resumo

| Da planilha | Para o modelo |
|-------------|-----------------|
| Várias abas de “listas de processos” | Uma entidade `ProcessoLicenciamento` + filtros |
| Multiplos SQLs / interessados | Relações 1:N |
| Eventos + Eventos Administrativos | Uma tabela `Evento` com categoria |
| Hospitais / CEUs / SESCs / TJ-SP | Categorias por coordenadoria |
| OODC / eventos de Outorga | Vínculo opcional com `Processo` (Outorga) |
| SERVIN no título da planilha | Piloto; modelo já multi-coordenadoria |
