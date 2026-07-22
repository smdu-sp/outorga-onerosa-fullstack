# Ideias para Modernização do Portal de Outorga Onerosa da Cidade de São Paulo

## Objetivo

Criar um portal moderno, transparente e orientado por dados para a gestão da Outorga Onerosa do Direito de Construir (OODC), inspirado nas melhores práticas internacionais de captura da valorização imobiliária (*Land Value Capture*).

---

# Referências Internacionais

## 🇬🇧 Londres — Community Infrastructure Levy (CIL)

### Destaques

- Dashboard público de arrecadação
- Relatórios anuais
- Transparência na aplicação dos recursos
- Dados por distrito (Borough)
- Obras financiadas
- Dados abertos

### Ideias para São Paulo

- Arrecadação em tempo real
- Relatórios anuais automáticos
- Prestação de contas pública
- Evolução histórica da arrecadação
- Dashboard financeiro

---

## 🇺🇸 Nova York — Zoning Bonus / Inclusionary Housing

### Destaques

- Mapas GIS
- Dados geoespaciais
- Lotes participantes
- Índices urbanísticos
- GeoJSON
- APIs públicas

### Ideias para São Paulo

Mapa interativo contendo:

- Empreendimento
- Processo
- Endereço
- Lote
- Distrito
- Subprefeitura
- Zona
- Coeficiente Básico
- Coeficiente Máximo
- Coeficiente Utilizado
- Área adicional construída
- Valor da Outorga
- Situação do processo

---

## 🇨🇦 Vancouver — Community Amenity Contributions (CAC)

### Destaques

Publicação de:

- Valor da contrapartida
- Tipo da contrapartida
- Empreendimento
- Bairro
- Equipamentos financiados

### Ideias para São Paulo

Mostrar para cada empreendimento:

- Quanto pagou
- Onde foi investido
- Qual equipamento público recebeu o recurso
- Percentual utilizado

---

## 🇸🇬 Singapura — Development Charge

### Destaques

Cobrança baseada em:

- Zona
- Uso
- Potencial construtivo
- Valor do terreno

### Ideias

Simulador público de cálculo da Outorga.

---

## 🇭🇰 Hong Kong — Land Premium

### Destaques

Avaliação imobiliária integrada.

### Ideias

Painel mostrando:

- Valor do terreno
- Potencial construtivo
- Valor arrecadado
- Índice de aproveitamento

---

# Funcionalidades Propostas

---

# Dashboard Executivo

## Indicadores

- Arrecadação hoje
- Arrecadação no mês
- Arrecadação no ano
- Arrecadação histórica
- Quantidade de processos
- Valor médio por processo
- Área construída adicional
- Área licenciada
- Quantidade de empreendimentos

---

# Dashboard Financeiro

## KPIs

- Valor arrecadado por mês
- Valor arrecadado por ano
- Comparativo entre anos
- Meta anual
- Percentual atingido
- Evolução histórica

Gráficos:

- Linha temporal
- Barras
- Área acumulada
- Heatmap mensal

---

# Dashboard Urbanístico

Indicadores:

- Área construída adicional
- Coeficiente médio utilizado
- Área computável
- Área não computável
- Uso residencial
- Uso não residencial
- Uso misto

---

# Dashboard Territorial

Mapa interativo.

Filtros:

- Distrito
- Subprefeitura
- Zona
- Operação Urbana
- Macroárea
- Setor
- Quadra
- Lote

Camadas:

- Zoneamento
- Empreendimentos
- Operações Urbanas
- HIS
- ZEIS
- Equipamentos públicos

---

# Dashboard dos Empreendimentos

Cada empreendimento possui uma página.

## Informações

- Nome
- Processo
- Responsável
- Incorporadora
- Proprietário
- Endereço
- Distrito
- Coordenadas
- Fotos
- Projeto aprovado

Indicadores

- Valor pago
- Valor pendente
- Área construída
- Área adicional
- Coeficiente utilizado
- Situação

---

# Dashboard das Incorporadoras

Ranking das empresas.

Indicadores

- Quantidade de projetos
- Valor pago
- Área construída
- Área adicional
- Média por empreendimento

---

# Dashboard Regional

Ranking por:

- Distrito
- Subprefeitura
- Zona
- Operação Urbana

Indicadores

- Arrecadação
- Quantidade de processos
- Área construída
- Valor médio

---

# Dashboard Histórico

Linha do tempo desde 2002.

Mostrar:

- Mudanças legislativas
- Plano Diretor
- Revisões
- Arrecadação anual
- Evolução dos coeficientes

---

# Ranking Geral

Top 100

- Maiores arrecadações
- Maiores empreendimentos
- Maiores áreas construídas
- Maiores coeficientes
- Maiores incorporadoras

---

# Transparência

Página específica.

Mostrar:

- Quanto foi arrecadado
- Quanto foi gasto
- Onde foi gasto
- Saldo disponível

Filtros por ano.

---

# Obras Financiadas

Mapa mostrando:

- Parque
- Escola
- Corredor de ônibus
- Drenagem
- Urbanização
- HIS
- Mobilidade

Cada obra mostra:

- Valor recebido
- Fonte do recurso
- Status
- Fotos
- Cronograma

---

# Dados Abertos

Download em:

- CSV
- Excel
- GeoJSON
- Shapefile
- API REST

---

# API Pública

Endpoints

```
GET /empreendimentos

GET /processos

GET /arrecadacao

GET /mapa

GET /obras

GET /ranking

GET /indicadores
```

---

# Simulador de Outorga

Permitir informar:

- Área do terreno
- Zona
- Uso
- Coeficiente
- Área pretendida

Resultado:

- Valor estimado
- Memória de cálculo
- Fórmulas utilizadas

---

# Relatórios

Gerar automaticamente:

- PDF
- Excel
- CSV

Tipos

- Mensal
- Trimestral
- Semestral
- Anual

---

# Inteligência de Dados

Indicadores

- Tempo médio de aprovação
- Tempo médio de pagamento
- Distritos com maior crescimento
- Tendência de arrecadação
- Comparação histórica
- Evolução da construção civil

---

# Ferramentas GIS

Integração com:

- GeoSampa
- GeoJSON
- WMS
- WFS
- ArcGIS
- QGIS

---

# Pesquisa Avançada

Pesquisar por:

- Processo
- SQL
- Endereço
- Nome do empreendimento
- Incorporadora
- Distrito
- Bairro
- CEP
- Zona

---

# Experiência do Usuário (UX)

## Página inicial

Cards com:

- Arrecadação atual
- Quantidade de processos
- Obras financiadas
- Mapa
- Ranking
- Notícias

---

## Visualizações

- Cartões (Cards)
- Dashboards
- Mapas
- Tabelas
- Linha do tempo
- Heatmaps
- Gráficos interativos

---

# Tecnologias Sugeridas

Frontend

- Next.js
- React
- Tailwind CSS
- MUI ou Shadcn/UI
- MapLibre GL ou Leaflet
- Chart.js ou Apache ECharts

Backend

- NestJS
- PostgreSQL/PostGIS
- Prisma
- Redis

Mapas

- GeoSampa
- OpenStreetMap
- PostGIS
- GeoServer

---

# Diferenciais

- Transparência total da arrecadação e da aplicação dos recursos.
- Integração com dados geoespaciais e mapas interativos.
- Visualização histórica desde a criação da OODC.
- Painéis específicos para gestores, técnicos e cidadãos.
- API pública e dados abertos para pesquisadores e desenvolvedores.
- Simulador oficial de cálculo da Outorga Onerosa.
- Relatórios automáticos e exportação em múltiplos formatos.
- Interface responsiva, acessível e orientada por boas práticas de UX/UI.
- Integração com indicadores urbanísticos e planejamento territorial.

---

# Objetivo Final

Transformar o portal da Outorga Onerosa da Cidade de São Paulo em uma plataforma de referência nacional e internacional em transparência, inteligência urbana e gestão pública baseada em dados, inspirada nas melhores práticas de Londres, Nova York, Vancouver, Singapura e Hong Kong.