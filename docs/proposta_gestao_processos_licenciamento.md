# Proposta: Módulo de Gestão de Processos de Licenciamento

## 1. Visão Geral

Este documento propõe o módulo **Gestão de Processos de Licenciamento**,
voltado às coordenadorias de análise que tramitam processos de
licenciamento edilício:

- RESID
- SERVIN
- COMIN
- CAEPP
- PARHIS

A planilha de Controle de Processos da SERVIN é a principal **fonte de
levantamento de requisitos** e poderá servir como **piloto de importação
de dados**. Ela não define a identidade do produto: o módulo é
transversal a todas as coordenadorias acima.

O sistema não deve reproduzir abas e colunas da planilha em páginas web.
A planilha deve ser usada para identificar **entidades, relacionamentos,
regras de negócio, filtros, históricos e visões gerenciais**.

Dois problemas centrais identificados no descritivo da planilha:

1. **Relacionamentos múltiplos:** um mesmo processo pode possuir vários
   SQLs, várias frentes/endereços e vários proprietários/interessados.
2. **Histórico:** é necessário preservar mudanças de técnico, situação
   do processo, publicações, eventos e demais movimentações ao longo do
   tempo.

Esses problemas são naturais em uma planilha, mas podem ser tratados em
um banco de dados relacional e em uma aplicação web.

------------------------------------------------------------------------

## 2. Premissa de Domínio: Licenciamento × Outorga

No portal atual de Outorga Onerosa, a tabela `processos` representa o
**processo de Outorga** (PDE / COTA / AIU, parcelas, quitação, quebra).
Esse registro existe quando, na análise do licenciamento, identifica-se
necessidade de cobrança de potencial construtivo adicional.

As coordenadorias de análise, porém, gerenciam o **processo de
licenciamento edilício** (tramitação, técnico, situação, prazos,
ofícios, eventos) — independentemente de haver Outorga.

| | Licenciamento | Outorga (módulo atual) |
|---|---|---|
| Quem cuida | RESID, SERVIN, COMIN, CAEPP, PARHIS | CAP / DEUSO / FUNDURB |
| Foco | Tramitação e análise técnica | Contrapartida financeira |
| Status típico | Análise, Comunique-se, Deferido… | Em pagamento, Quitado, Quebra |
| Volume | Todos os processos da unidade | Só os que têm OODC |
| Entidade | `ProcessoLicenciamento` (nova) | `Processo` (existente) |

**Decisão de arquitetura:** duas entidades distintas, com vínculo
opcional.

- O núcleo deste módulo é **`ProcessoLicenciamento`**.
- O **`Processo`** de Outorga permanece como está.
- Quando o técnico identifica OODC, cria-se ou vincula-se o registro de
  Outorga ao processo de licenciamento (pelo vínculo explícito e/ou pelo
  número SEI/AD compartilhado).
- Nem todo licenciamento gera Outorga; a tramitação não depende do
  módulo financeiro.

``` text
Coordenadorias de análise
        │
        ▼
ProcessoLicenciamento ─── Eventos, Distribuições, Ofícios, Imóveis…
        │
        │ (opcional, quando há OODC)
        ▼
Processo (Outorga) ─── Parcelas, status de pagamento, monitoramento…
```

O menu e as telas de Outorga já existentes não devem ser confundidos com
este módulo. São produtos funcionais distintos no mesmo sistema.

------------------------------------------------------------------------

## 3. Conceito Central: Processo de Licenciamento

O núcleo do módulo é a entidade **ProcessoLicenciamento**.

Todo processo **pertence obrigatoriamente a uma coordenadoria**.
Técnico, divisão, permissões, dashboard e relatórios respeitam essa
dimensão.

Em vez de reproduzir a aba **Processos Ativos** como uma tela com
dezenas de colunas, cada processo terá uma página própria.

Exemplo:

> **Processo 1020.2022/0008232-0**\
> Alvará de Aprovação e Execução de Edificação Nova\
> Coordenadoria: SERVIN\
> Status: Indeferido\
> Técnico atual: Eliana\
> Divisão: DSIGP\
> Sistema: AD\
> Outorga: vinculada (ou sem incidência)

A página do processo pode ser organizada nas seguintes seções ou abas:

- Resumo
- Imóveis / SQLs
- Interessados / Proprietários
- Eventos
- Distribuições
- Ofícios
- Financeiro / Incidências (taxas do licenciamento; link para Outorga se houver)
- Documentos
- Histórico

As informações deixam de ficar concentradas em uma linha gigantesca e
passam a ser organizadas conforme sua natureza.

------------------------------------------------------------------------

## 4. Abas da Planilha como Visões, não como Tabelas

As abas da planilha SERVIN (e equivalentes em outras unidades) não
precisam se transformar em entidades independentes:

- Processos Ativos
- Eventos
- Eventos Administrativos
- Processos Encerrados
- Físicos
- Ofícios
- Categorias especiais de monitoramento (ex.: TJ-SP, Hospitais, CEUs…)
- Arquivados

Muitas delas são **visões ou filtros** sobre os mesmos dados.

### Categorias especiais (configuráveis por coordenadoria)

Categorias como Hospital, UBS, UPA, CEU, SESC ou TJ-SP são comuns na
SERVIN, mas **não são domínio universal**. Devem ser cadastros auxiliares
**por coordenadoria** (tags/categorias).

Assim, a tela:

**Monitoramento > Hospitais**

é apenas uma consulta dos processos da coordenadoria classificados nessa
categoria — e só aparece se a coordenadoria tiver essa categoria ativa.

Conceitualmente:

``` sql
SELECT *
FROM processos_licenciamento pl
JOIN processo_categoria pc ON pc.processo_id = pl.id
JOIN categoria c ON c.id = pc.categoria_id
WHERE pl.coordenadoria = :coord
  AND c.codigo = 'HOSPITAL';
```

A informação existe uma única vez e pode ser apresentada em diferentes
visões, sem sincronizar abas manualmente.

------------------------------------------------------------------------

## 5. Modelo Conceitual de Entidades

``` text
PROCESSO_LICENCIAMENTO
│
├── COORDENADORIA (obrigatória)
│
├── SQL / IMÓVEIS
│     ├── SQL
│     ├── INCRA
│     ├── endereço
│     └── tipo
│
├── INTERESSADOS
│     ├── nome
│     ├── CPF/CNPJ
│     └── tipo de vínculo
│
├── EVENTOS
│     ├── tipo
│     ├── técnico
│     ├── data início
│     ├── data término
│     ├── descrição
│     └── observação
│
├── DISTRIBUIÇÕES
│     ├── diretoria / divisão
│     ├── técnico
│     ├── data início
│     └── data fim
│
├── SITUAÇÕES / HISTÓRICO
│
├── OFÍCIOS
│
├── PUBLICAÇÕES DOC
│
├── INCIDÊNCIAS / TAXAS (do licenciamento)
│
├── CATEGORIAS (escopo por coordenadoria)
│
├── ARQUIVAMENTO
│
└── VÍNCULO OPCIONAL → PROCESSO (Outorga)
```

Essa estrutura representa os dados de forma relacional e evita repetição.

------------------------------------------------------------------------

## 6. Tratamento de Múltiplos SQLs

Um processo pode possuir:

- vários SQLs;
- vários endereços ou frentes;
- vários proprietários.

Na planilha, o espaço de uma linha limita essas informações. No sistema,
o processo pode ter qualquer quantidade de imóveis relacionados.

### Exemplo

| SQL            | Endereço                | Tipo         |
|----------------|-------------------------|--------------|
| 010.013.0002-5 | Rua da Consolação, 1009 | Principal    |
| 010.013.0644-9 | Rua da Consolação, 1009 | Complementar |
| 010.013.0650-3 | Rua Exemplo, 20         | Complementar |

O mesmo conceito vale para interessados e proprietários.

Isso permite buscas por SQL, endereço, interessado ou proprietário, e
elimina a necessidade de abas auxiliares do tipo **Múltiplos SQLs**.

------------------------------------------------------------------------

## 7. Eventos como Histórico do Processo

**Eventos** são parte central do módulo: preservam a tramitação e a
análise ao longo do tempo.

Na página do processo, os eventos aparecem como **linha do tempo**.

### Exemplo

**10/01/2026 — Comunique-se**

Técnico: Fabio\
Publicação DOC realizada.

↓

**15/01/2026 — Análise**

Técnico: Fabio\
Processo em análise técnica.

↓

**22/01/2026 — Distribuição**

Processo distribuído para Carla.

↓

**03/02/2026 — Análise**

Técnico: Carla.

Essa visualização permite compreender rapidamente o histórico do
processo.

------------------------------------------------------------------------

## 8. Eventos Automáticos

Além dos eventos manuais, alterações relevantes geram eventos
automaticamente.

### Alteração de técnico responsável

`Fabio → Carla`

> **05/08/2026 14:32 — Alteração de responsável**\
> Processo transferido de Fabio para Carla.\
> Usuário responsável pela alteração: João.

### Alteração de situação

`Análise Inicial → Comunique-se`

> **05/08/2026 — Situação alterada**\
> Análise Inicial → Comunique-se.

Isso cria auditoria do processo e reduz dependência de registros
manuais.

------------------------------------------------------------------------

## 9. Eventos Técnicos e Eventos Administrativos

A interface pode manter a separação entre atividades técnicas e
administrativas. No banco, usa-se uma estrutura única de eventos com
classificação:

``` text
categoria_evento:
- TÉCNICO
- ADMINISTRATIVO
- AUTOMÁTICO
```

### Eventos técnicos (exemplos)

- análise inicial;
- análise complementar;
- comunique-se;
- reunião;
- parecer;
- manifestação técnica.

### Eventos administrativos (exemplos)

- recebimento;
- encaminhamento;
- publicação;
- emissão de ofício;
- arquivamento.

Tipos de evento podem variar por coordenadoria (cadastro auxiliar com
escopo global e/ou local).

------------------------------------------------------------------------

## 10. Processos Ativos e Encerrados

**Ativos** e **Encerrados** não são tabelas diferentes.

Existe apenas **ProcessoLicenciamento**, com estado que determina se
está ativo ou encerrado:

``` text
status_ciclo:
- ATIVO
- ENCERRADO
```

Menu:

``` text
Processos
├── Ativos
├── Encerrados
└── Todos
```

Quando a situação for, por exemplo, Deferido Encerrado ou Indeferido
Encerrado, o processo deixa de aparecer na consulta de ativos. Não há
transferência de registros entre tabelas.

------------------------------------------------------------------------

## 11. Dashboard de Gestão

Tela inicial voltada à gestão, **sempre no contexto da coordenadoria**
(ou com filtro de coordenadoria para perfis elevados).

### Exemplo

# Gestão de Processos de Licenciamento — SERVIN

**1.042** processos ativos\
**87** em análise\
**132** em comunique-se\
**48** sem técnico\
**23** prioritários

Indicadores sugeridos:

- processos por situação;
- processos por técnico;
- processos por divisão;
- tempo médio de análise;
- alertas (sem movimentação, prioritários parados, comunique-se
  aguardando retorno, recebidos sem técnico).

Coordenadores e diretores acompanham carga e processos que precisam de
atenção. Perfis com visão institucional podem consolidar ou filtrar por
coordenadoria.

------------------------------------------------------------------------

## 12. Busca Global

Busca acessível no topo da interface do módulo, localizando processos de
licenciamento por:

- número do processo;
- protocolo;
- SQL;
- INCRA;
- interessado;
- proprietário;
- endereço;
- técnico;
- assunto;
- número de ofício;
- coordenadoria (quando o perfil permitir visão ampla).

Casos típicos:

- existe processo em determinada rua?
- existe processo relacionado a determinado SQL?
- quantos processos determinada empresa possui ativos?

Quando houver vínculo com Outorga, o resultado pode indicar esse vínculo
sem misturar a busca financeira do módulo de Outorga.

------------------------------------------------------------------------

## 13. Fluxo de Trabalho do Técnico

Área voltada ao trabalho cotidiano, restrita aos processos da
coordenadoria do usuário (e, na prática, aos atribuídos a ele).

### Meus Processos

| Processo      | Assunto         | Situação        | Último evento | Dias | Ação  |
|---------------|-----------------|-----------------|---------------|------|-------|
| 1020.2025/... | Reforma         | Análise inicial | 02/08         | 3    | Abrir |
| 1020.2024/... | Edificação Nova | Comunique-se    | 12/07         | 24   | Abrir |
| 1020.2026/... | Regularização   | Análise         | 04/08         | 1    | Abrir |

Ao abrir um processo, o técnico registra uma nova ação (tipo de evento,
datas, descrição, observação). Os dados cadastrais já estão no sistema.

Se o evento implicar mudança de situação, o sistema pode atualizar o
estado atual automaticamente.

------------------------------------------------------------------------

## 14. Minha Fila

Visão operacional do técnico:

### Minha Fila

**Em andamento — 7**

**Aguardando interessado — 12**

**Aguardando outro órgão — 4**

**Recebidos recentemente — 3**

**Sem movimentação há mais de 30 dias — 5**

O módulo deixa de ser só cadastro e passa a organizar o trabalho diário.

------------------------------------------------------------------------

## 15. Visão da Equipe para Gestores

Coordenadores e gestores veem a equipe da **sua coordenadoria**:

| Técnico | Atribuídos | Em trabalho | > 30 dias | > 60 dias |
|---------|------------|-------------|-----------|-----------|
| Ana     | 42         | 7           | 5         | 2         |
| Carla   | 38         | 9           | 3         | 0         |
| Fabio   | 51         | 11          | 8         | 4         |

Distinção importante:

- **Atribuídos:** sob responsabilidade do técnico.
- **Em trabalho:** com atividade efetivamente em andamento.

------------------------------------------------------------------------

## 16. Sugestão de Menu

``` text
Gestão de Processos de Licenciamento
│
├── Dashboard
│
├── Processos
│    ├─ Ativos
│    ├─ Encerrados
│    ├─ Físicos
│    └─ Busca avançada
│
├── Meu trabalho
│    ├─ Minha fila
│    ├─ Em andamento
│    └─ Histórico
│
├── Monitoramento          ← itens conforme categorias da coordenadoria
│    └─ (ex.: Hospitais, CEUs, SESC, TJ-SP na SERVIN)
│
├── Ofícios
│
├── Arquivo físico
│
├── Relatórios
│
└── Administração
     ├─ Coordenadorias / divisões
     ├─ Técnicos
     ├─ Tipos de evento
     ├─ Situações
     ├─ Assuntos
     ├─ Categorias de monitoramento
     └─ Usuários / permissões
```

O menu de Outorga (processos OODC, parcelas, relatórios de arrecadação)
permanece separado.

------------------------------------------------------------------------

## 17. Processos Físicos e Arquivamento

Processos físicos usam a mesma entidade `ProcessoLicenciamento`, com
atributo de origem/sistema:

``` text
tipo_sistema:
- SEI
- FÍSICO
- AD
```

Dados específicos de arquivo físico podem ficar em entidade
complementar:

``` text
ARQUIVAMENTO
├── processo_licenciamento
├── situação
├── local
├── container
├── caixa
├── posição
├── data de arquivamento
└── observação
```

------------------------------------------------------------------------

## 18. Ofícios

Entidade própria relacionada ao processo de licenciamento (0..N):

``` text
OFICIO
├── número
├── processo_licenciamento
├── tipo
├── destinatário
├── data
├── assunto
├── situação
└── observação
```

Pesquisa tanto pelo processo quanto pelo número do ofício.

------------------------------------------------------------------------

## 19. Histórico e Auditoria

Além dos eventos funcionais, manter auditoria de alterações:

- alteração de técnico;
- alteração de situação;
- inclusão ou exclusão de SQL;
- alteração de interessado;
- mudança de divisão ou coordenadoria;
- encerramento / reabertura;
- arquivamento;
- vínculo / desvínculo com Outorga;
- demais dados relevantes.

Cada registro:

``` text
data/hora
usuário
tipo de alteração
valor anterior
valor novo
processo relacionado
```

------------------------------------------------------------------------

## 20. Relatórios

Filtros combináveis, sempre com dimensão de coordenadoria.

### Processos

- ativos / encerrados;
- por situação, assunto, sistema, divisão, técnico;
- por coordenadoria (visão ampla).

### Produtividade / Eventos

- eventos por período;
- análises iniciadas / concluídas;
- comunique-se emitidos;
- processos trabalhados por técnico.

### Tempo

- tempo médio por situação;
- tempo médio de análise;
- sem movimentação;
- acima de prazo.

### Categorias

Conforme categorias ativas da coordenadoria (ex.: hospitais, CEUs na
SERVIN).

### Integração com Outorga

- processos de licenciamento com / sem vínculo de Outorga;
- atalho para o processo financeiro correspondente.

------------------------------------------------------------------------

## 21. Princípio de Arquitetura

O sistema não deve ser pensado como:

> "Uma versão web da planilha."

O modelo recomendado:

``` text
PROCESSO_LICENCIAMENTO (+ coordenadoria)
        │
        ├──────── Imóveis / SQLs
        ├──────── Interessados
        ├──────── Eventos
        ├──────── Distribuições
        ├──────── Situações
        ├──────── Ofícios
        ├──────── Publicações
        ├──────── Categorias
        ├──────── Arquivamento
        └──────── (opcional) Processo Outorga
                         │
                         ↓
                 BANCO DE DADOS
                         │
             ┌───────────┼───────────┐
             ↓           ↓           ↓
         Técnico      Gestor     Relatórios
```

A informação deve existir **uma única vez** e ser apresentada conforme
o papel do usuário.

------------------------------------------------------------------------

## 22. Arquitetura Multi-coordenadoria (requisito)

Não é expansão futura: é **premissa do módulo**.

- Cada `ProcessoLicenciamento` tem coordenadoria obrigatória.
- Técnico vê, em regra, processos da **sua** coordenadoria.
- Gestor/coordenador vê a unidade.
- Perfis elevados (ex.: GAB / administrador) podem filtrar todas.
- Tipos de evento, situações, assuntos, divisões e categorias podem ter
  escopo global e/ou por coordenadoria.
- Dashboard, fila, equipe e relatórios respeitam o contexto da unidade.
- A planilha SERVIN é piloto de requisitos e, se desejado, de
  migração — sem acoplar o modelo às particularidades só dela.

Coordenadorias contempladas inicialmente:

- RESID
- SERVIN
- COMIN
- CAEPP
- PARHIS

------------------------------------------------------------------------

## 23. Resumo da Arquitetura Proposta

> **ProcessoLicenciamento como núcleo → coordenadoria obrigatória →
> relações múltiplas → eventos e histórico → vínculo opcional com
> Outorga → visões especializadas → dashboards e relatórios.**

As abas da planilha classificam-se em:

### Dados

- ProcessoLicenciamento
- SQL / imóvel
- Interessado
- Evento
- Distribuição
- Ofício
- Arquivamento
- Categoria
- Vínculo com Processo (Outorga), quando houver

### Visões

- Processos Ativos / Encerrados
- Físicos
- Categorias de monitoramento da coordenadoria

### Cadastros auxiliares

- tipos de evento;
- situações;
- divisões;
- técnicos;
- assuntos;
- categorias;
- sistemas;
- coordenadorias.

------------------------------------------------------------------------

## 24. Próxima Etapa Recomendada

**Mapeamento detalhado das colunas da planilha (piloto SERVIN) para o
modelo de dados**, sem travar o desenho nas demais unidades.

1. analisar colunas de Processos Ativos;
2. classificar cada coluna;
3. identificar campos do processo;
4. identificar relações 1:N e N:N;
5. mapear Eventos e Eventos Administrativos;
6. mapear Ofícios e Arquivados;
7. identificar listas/domínios;
8. definir o que vem de integrações (SEI, AD, GeoSampa etc.) e o que
   continua manual;
9. definir o modelo de vínculo com o `Processo` de Outorga;
10. listar categorias iniciais por coordenadoria (começando pela SERVIN).

Modelo-alvo aproximado:

``` text
processo_licenciamento
coordenadoria
processo_imovel
imovel
processo_interessado
interessado
evento
tipo_evento
distribuicao
situacao
processo_categoria
categoria
oficio
arquivamento
usuario
processo_outorga          -- entidade já existente (vínculo)
```

A partir disso: DER, tabelas, regras, permissões, protótipos de tela,
fluxos (técnico / administrativo / gestor), dashboard, relatórios e
estratégia de importação do piloto SERVIN.

------------------------------------------------------------------------

## Conclusão

A planilha SERVIN não deve ser descartada: é excelente fonte de
requisitos. Suas limitações (múltiplos SQLs/interessados, duplicação,
falta de histórico estruturado) pedem reorganização em banco e
aplicação.

O módulo **Gestão de Processos de Licenciamento** usa
**ProcessoLicenciamento** como entidade central, com **coordenadoria
obrigatória**, e mantém o **Processo de Outorga** separado, com vínculo
opcional quando houver cobrança.

Objetivos simultâneos:

1. **Operacional:** trabalho diário de técnicos e administrativos.
2. **Gerencial:** carga, situação, prazos e produtividade por unidade.
3. **Estratégico:** indicadores e relatórios confiáveis entre as
   coordenadorias de licenciamento.
)
