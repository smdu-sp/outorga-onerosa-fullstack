/**
 * Tabelas de apoio do cálculo da Outorga Onerosa (OODC), extraídas das abas de
 * consulta da planilha oficial `public/planilhas/oodc-prot-v1 1 0-desbloqueada.xlsm`
 * (aba `oodc`, versão 1.1.0 de 22/01/2026).
 *
 * São dados legais (leis, coeficientes Fp/Fs, tipologias) que só mudam quando a
 * legislação muda — por isso ficam como constantes versionadas no código, do
 * mesmo jeito que a planilha oficial versiona por decreto (ver aba `versoes`),
 * e não como tabelas no banco. A única exceção é a tabela `v` (valor unitário do
 * m² por setor/quadra/codlog, ~180 mil linhas), que vira `OodcValorReferencia` no
 * banco — ver `lib/server/oodc-valor-referencia.ts`.
 *
 * Quando a planilha oficial for atualizada, reextrair estas tabelas das abas de
 * mesmo nome (`assuntos`, `leis`, `macrozonas`, `macroareas`, `zonas`, `usos`,
 * `tipologias`, `fp`, `fs`, `base_cal`, `base_frui`, `base_mel`, `class_empr`,
 * `areas`).
 */

export const VERSAO_PLANILHA_OODC = '1.1.0';
export const DATA_VERSAO_PLANILHA_OODC = '2026-01-22';

/** IDs de legislação (tbl_lei) que correspondem ao PIU Central (AIU Setor Central). */
export const IDS_LEGISLACAO_PIU_CENTRAL = [5, 6, 7] as const;

/** IDs de zona de uso (tbl_zona) tratados como ZEM/ZEMP — Fp fixo = 2. */
export const IDS_ZONA_FP_FIXO_2 = [5, 6] as const;

/** IDs de tipologia (tbl_tpl) que são HIS / HMP até 70m² — não sofrem a penalidade de Fs. */
export const IDS_TIPOLOGIA_HIS_HMP = [1, 2, 3] as const;

/** ID de tipologia "Habitação com área maior que 70 m²" — sofre a fórmula graduada de Fs. */
export const ID_TIPOLOGIA_HABITACAO_MAIOR_70M2 = 8;

/** IDs de tipologia (1-8, classe "Habitacional") — usados para derivar uso R/nR. */
export const IDS_TIPOLOGIA_HABITACIONAL = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** ID de assunto "Projeto modificativo..." — único caso em que a área de outorga já adquirida é descontada. */
export const ID_ASSUNTO_PROJETO_MODIFICATIVO = 3;

/** IDs de classificação do empreendimento (tbl_class_empr) com isenção total da contrapartida. */
export const IDS_CLASSIFICACAO_ISENTA = [1, 3] as const; // EHIS, EZEIS

export interface ItemTabela {
	id: number;
	nome: string;
}

/** aba `assuntos` */
export const ASSUNTOS: ItemTabela[] = [
	{ id: 1, nome: 'Alvará de aprovação de edificação nova' },
	{ id: 2, nome: 'Alvará de aprovação e execução de edificação nova' },
	{ id: 3, nome: 'Projeto modificativo de alvará de aprovação e execução de edificação nova' },
	{ id: 4, nome: 'Alvará de execução de edificação nova' },
	{ id: 5, nome: 'Alvará de aprovação e execução para residência unifamiliar' },
];

/** aba `leis` (tbl_lei) */
export const LEIS: ItemTabela[] = [
	{ id: 1, nome: 'Lei 16.050/2014; Lei 13.885/2004' },
	{ id: 2, nome: 'Lei 16.050/2014; Lei 16.402/2016' },
	{ id: 3, nome: 'Lei 17.975/2023; Lei 16.050/2014; Lei 16.402/2016' },
	{ id: 4, nome: 'Lei 17.975/2023; Lei 16.050/2014; Lei 18.081/2024; Lei 16.402/2016' },
	{ id: 5, nome: 'Lei 17.844/2022; Lei 16.050/2014; Lei 16.402/2016' },
	{ id: 6, nome: 'Lei 17.844/2022; Lei 17.975/2023; Lei 16.050/2014; Lei 16.402/2016' },
	{ id: 7, nome: 'Lei 17.844/2022; Lei 17.975/2023; Lei 16.050/2014; Lei 18.081/2024; Lei 16.402/2016' },
];

/** aba `macrozonas` */
export const MACROZONAS: ItemTabela[] = [
	{ id: 1, nome: 'MZURB - Macrozona de estruturação e qualificação urbana' },
	{ id: 2, nome: 'MZAMB - Macrozona de proteção e recuperação ambiental' },
];

/** aba `macroareas` */
export const MACROAREAS: ItemTabela[] = [
	{ id: 1, nome: 'MUC - Macroárea de urbanização consolidada' },
	{ id: 2, nome: 'MQU - Macroárea de qualificação urbana' },
	{ id: 3, nome: 'MRVU - Macroárea de redução da vulnerabilidade' },
	{ id: 4, nome: 'MEM - Macroárea de estruturação metropolitana Arco leste' },
	{ id: 5, nome: 'MEM - Macroárea de estruturação metropolitana Arco tietê' },
	{ id: 6, nome: 'MEM - Macroárea de estruturação metropolitana Arco tamanduateí' },
	{ id: 7, nome: 'MEM - Macroárea de estruturação metropolitana Arco pinheiros' },
	{ id: 8, nome: 'MEM - Macroárea de estruturação metropolitana Arco faria lima/águas espraiadas/chucri zaidan' },
	{ id: 9, nome: 'MEM - Macroárea de estruturação metropolitana Arco jurubatuba' },
	{ id: 10, nome: 'MEM - Macroárea de estruturação metropolitana Arco jacu-pêssego' },
	{ id: 11, nome: 'MEM - Macroárea de estruturação metropolitana Avenida cupecê' },
	{ id: 12, nome: 'MEM - Macroárea de estruturação metropolitana Noroeste' },
	{ id: 13, nome: 'MEM - Macroárea de estruturação metropolitana Fernão dias' },
	{ id: 14, nome: 'MEM - Macroárea de estruturação metropolitana Setor central' },
	{ id: 15, nome: 'MRVURA - Macroárea de redução da vulnerabilidade e recuperação ambiental' },
	{ id: 16, nome: 'MCQUA - Macroárea de controle e qualificação urbana e ambiental' },
	{ id: 17, nome: 'MCUUS - Macroárea de contenção urbana e uso sustentável' },
	{ id: 18, nome: 'MPEN - Macroárea de preservação de ecossitemas naturais' },
];

/** aba `usos` (R=1 / nR=2) */
export const USOS: ItemTabela[] = [
	{ id: 1, nome: 'R - Residencial' },
	{ id: 2, nome: 'nR - Não residencial' },
];

/** aba `zonas` (tbl_zona) */
export const ZONAS: ItemTabela[] = [
	{ id: 1, nome: 'ZEU - Zona eixo de estruturação da transformação urbana' },
	{ id: 2, nome: 'ZEUa - Zona eixo de estruturação da transformação urbana ambiental' },
	{ id: 3, nome: 'ZEUP - Zona eixo de estruturação da transformação urbana previsto' },
	{ id: 4, nome: 'ZEUPa - Zona eixo de estruturação da transformação urbana previsto ambiental' },
	{ id: 5, nome: 'ZEM - Zona eixo de estruturação da transformação metropolitana' },
	{ id: 6, nome: 'ZEMP - Zona eixo de estruturação da transformação metropolitana previsto' },
	{ id: 7, nome: 'ZC - Zona centralidade' },
	{ id: 8, nome: 'ZCa - Zona centralidade ambiental' },
	{ id: 9, nome: 'ZC-ZEIS - Zona centralidade lindeira à ZEIS' },
	{ id: 10, nome: 'ZCOR-1 - Zona corredor 1' },
	{ id: 11, nome: 'ZCOR-2 - Zona corredor 2' },
	{ id: 12, nome: 'ZCOR-3 - Zona corredor 3' },
	{ id: 13, nome: 'ZCORa - Zona corredor ambiental' },
	{ id: 14, nome: 'ZM - Zona mista' },
	{ id: 15, nome: 'ZMa - Zona mista ambiental' },
	{ id: 16, nome: 'ZMIS - Zona mista de interesse social' },
	{ id: 17, nome: 'ZMISa - Zona mista de interesse social ambiental' },
	{ id: 18, nome: 'ZEIS-1 - Zona especial de interesse social 1' },
	{ id: 19, nome: 'ZEIS-2 - Zona especial de interesse social 2' },
	{ id: 20, nome: 'ZEIS-3 - Zona especial de interesse social 3' },
	{ id: 21, nome: 'ZEIS-4 - Zona especial de interesse social 4' },
	{ id: 22, nome: 'ZEIS-5 - Zona especial de interesse social 5' },
	{ id: 23, nome: 'ZDE-1 - Zona de desenvolvimento econômico 1' },
	{ id: 24, nome: 'ZDE-2 - Zona de desenvolvimento econômico 2' },
	{ id: 25, nome: 'ZPI-1 - Zona predominantemente industrial 1' },
	{ id: 26, nome: 'ZPI-2 - Zona predominantemente industrial 2' },
	{ id: 27, nome: 'ZOE - Zona de ocupação especial' },
	{ id: 28, nome: 'ZPR - Zona predominantemente residencial' },
	{ id: 29, nome: 'ZER-1 - Zona exclusivamente residencial 1' },
	{ id: 30, nome: 'ZER-2 - Zona exclusivamente residencial 2' },
	{ id: 31, nome: 'ZERa - Zona exclusivamente residencial ambiental' },
	{ id: 32, nome: 'ZPDS - Zona de preservação e desenvolvimento sustentável' },
	{ id: 33, nome: 'ZPDSr - Zona de preservação e desenvolvimento sustentável da zona rural' },
	{ id: 34, nome: 'ZEPAM - Zona especial de proteção ambiental' },
	{ id: 35, nome: 'EETU - Área de influência dos eixos de estruturação da transformação urbana' },
	{ id: 36, nome: 'ZER-1 - Zona exclusivamente residencial de densidade demográfica baixa' },
	{ id: 37, nome: 'ZER-2 - Zona exclusivamente residencial de densidade demográfica média' },
	{ id: 38, nome: 'ZER-3 - Zona exclusivamente residencial de densidade demográfica alta' },
	{ id: 39, nome: 'ZPI - Zona predominante industrial' },
	{ id: 40, nome: 'ZM-1 - Zona mista de densidade demográfica e construtiva baixa' },
	{ id: 41, nome: 'ZM-2 - Zona mista de densidade demográfica e construtiva média' },
	{ id: 42, nome: 'ZM-3a - Zona mista de densidade demográfica e construtiva alta' },
	{ id: 43, nome: 'ZM-3b - Zona mista de densidade demográfica e construtiva alta' },
	{ id: 44, nome: 'ZCP-a - Zona centralidade polar' },
	{ id: 45, nome: 'ZCP-b - Zona centralidade polar' },
	{ id: 46, nome: 'ZCP-p - Zona de centralidade polar de proteção ambiental' },
	{ id: 47, nome: 'ZM-p - Zona mista de proteção ambiental' },
	{ id: 48, nome: 'ZPDS - Zona de desenvolvimento sustentável' },
	{ id: 49, nome: 'ZER-p - Zona exclusivamente residencial de proteção ambiental' },
	{ id: 50, nome: 'ZLT - Zona de lazer e turismo' },
	{ id: 51, nome: 'ZEPAG - Zona especial de produção agrícola e de extração mineral' },
	{ id: 52, nome: 'ZCL-ab - Zona de centralidade linear' },
	{ id: 53, nome: 'ZCL-a - Zona de centralidade linear' },
	{ id: 54, nome: 'ZCL-b - Zona de centralidade linear' },
	{ id: 55, nome: 'ZCLz-I - Zona de centralidade linear lindeira ou interna a ZER' },
	{ id: 56, nome: 'ZCLz-II - Zona de centralidade linear lindeira ou interna a ZER' },
	{ id: 57, nome: 'ZTLz-I - Zona de transição linear da ZER' },
	{ id: 58, nome: 'ZTLz-II - Zona de transição linear da ZER' },
	{ id: 59, nome: 'ZCLp - Zona de centralidade linear de proteção ambiental' },
];

/** aba `tipologias` (tbl_tpl): classe + descrição. Ids 1-8 = classe Habitacional. */
export const TIPOLOGIAS: { id: number; classe: string; descricao: string }[] = [
	{ id: 1, classe: 'Habitacional', descricao: 'Habitação de interesse social – HIS' },
	{ id: 2, classe: 'Habitacional', descricao: 'Habitação do mercado popular – HMP até 50 m²' },
	{ id: 3, classe: 'Habitacional', descricao: 'Habitação do mercado popular – HMP de 51 até 70m²' },
	{ id: 4, classe: 'Habitacional', descricao: 'Habitação com área até 50 m²' },
	{ id: 5, classe: 'Habitacional', descricao: 'Habitação com área de 51 até 70 m²' },
	{ id: 6, classe: 'Habitacional', descricao: 'Habitação com área menor ou igual a 30 m²' },
	{ id: 7, classe: 'Habitacional', descricao: 'Habitação com área maior que 30 m² e menor ou igual a 70 m²' },
	{ id: 8, classe: 'Habitacional', descricao: 'Habitação com área maior que 70 m²' },
	{ id: 9, classe: 'Institucional', descricao: 'Hospitais públicos' },
	{ id: 10, classe: 'Institucional', descricao: 'Escolas públicas' },
	{ id: 11, classe: 'Institucional', descricao: 'Demais unidades públicas de saúde e creches' },
	{ id: 12, classe: 'Institucional', descricao: 'Unidades administrativas públicas' },
	{
		id: 13,
		classe: 'Institucional',
		descricao: 'Entidades privadas de serviço social e de formação profissional vinculadas ao sistema sindical',
	},
	{ id: 14, classe: 'Institucional', descricao: 'Instituições de cultura, esporte e lazer' },
	{ id: 15, classe: 'Entidades mantenedoras sem fins lucrativos', descricao: 'Templos religiosos' },
	{ id: 16, classe: 'Entidades mantenedoras sem fins lucrativos', descricao: 'Hospitais e clínicas' },
	{ id: 17, classe: 'Entidades mantenedoras sem fins lucrativos', descricao: 'Universidades' },
	{ id: 18, classe: 'Entidades mantenedoras sem fins lucrativos', descricao: 'Escolas e creches' },
	{ id: 19, classe: 'Entidades mantenedoras sem fins lucrativos', descricao: 'Equipamentos culturais e afins' },
	{ id: 20, classe: 'Outras entidades mantenedoras', descricao: 'Hospitais' },
	{ id: 21, classe: 'Outras entidades mantenedoras', descricao: 'Universidades' },
	{ id: 22, classe: 'Outras entidades mantenedoras', descricao: 'Escolas' },
	{ id: 23, classe: 'Outras entidades mantenedoras', descricao: 'Equipamentos culturais e afins' },
	{ id: 24, classe: 'Outras atividades', descricao: 'Outras atividades' },
];

/**
 * aba `fp` (tbl_fp) — Fator de Planejamento.
 * Duas famílias de linha:
 * - `idUso` + `idMacroarea` preenchidos (36 linhas): regra geral, fora do PIU Central.
 * - `idArea` + `dataInicio`/`dataFim` preenchidos (24 linhas): PIU Central (AIU Setor
 *   Central), com progressão temporal por área de qualificação/transformação.
 */
export interface LinhaFp {
	idUso?: number;
	idMacroarea?: number;
	idArea?: number;
	dataInicio?: string; // ISO yyyy-mm-dd
	dataFim?: string; // ISO yyyy-mm-dd — vazio/undefined = sem fim de vigência
	fp: number;
}

export const FP: LinhaFp[] = [
	// Uso 1 (Residencial) × Macroárea 1-18
	{ idUso: 1, idMacroarea: 1, fp: 0.7 },
	{ idUso: 1, idMacroarea: 2, fp: 0.6 },
	{ idUso: 1, idMacroarea: 3, fp: 0.3 },
	{ idUso: 1, idMacroarea: 4, fp: 0.3 },
	{ idUso: 1, idMacroarea: 5, fp: 1.2 },
	{ idUso: 1, idMacroarea: 6, fp: 1.2 },
	{ idUso: 1, idMacroarea: 7, fp: 1.2 },
	{ idUso: 1, idMacroarea: 8, fp: 1.2 },
	{ idUso: 1, idMacroarea: 9, fp: 1.2 },
	{ idUso: 1, idMacroarea: 10, fp: 0.3 },
	{ idUso: 1, idMacroarea: 11, fp: 0.3 },
	{ idUso: 1, idMacroarea: 12, fp: 0.3 },
	{ idUso: 1, idMacroarea: 13, fp: 0.3 },
	{ idUso: 1, idMacroarea: 14, fp: 1.2 },
	{ idUso: 1, idMacroarea: 15, fp: 1 },
	{ idUso: 1, idMacroarea: 16, fp: 1 },
	{ idUso: 1, idMacroarea: 17, fp: 1 },
	{ idUso: 1, idMacroarea: 18, fp: 1 },
	// Uso 2 (Não residencial) × Macroárea 1-18
	{ idUso: 2, idMacroarea: 1, fp: 1.3 },
	{ idUso: 2, idMacroarea: 2, fp: 0.5 },
	{ idUso: 2, idMacroarea: 3, fp: 0 },
	{ idUso: 2, idMacroarea: 4, fp: 0 },
	{ idUso: 2, idMacroarea: 5, fp: 1.3 },
	{ idUso: 2, idMacroarea: 6, fp: 1.3 },
	{ idUso: 2, idMacroarea: 7, fp: 1.3 },
	{ idUso: 2, idMacroarea: 8, fp: 1.3 },
	{ idUso: 2, idMacroarea: 9, fp: 1.3 },
	{ idUso: 2, idMacroarea: 10, fp: 0 },
	{ idUso: 2, idMacroarea: 11, fp: 0 },
	{ idUso: 2, idMacroarea: 12, fp: 0 },
	{ idUso: 2, idMacroarea: 13, fp: 0 },
	{ idUso: 2, idMacroarea: 14, fp: 1.3 },
	{ idUso: 2, idMacroarea: 15, fp: 0 },
	{ idUso: 2, idMacroarea: 16, fp: 0 },
	{ idUso: 2, idMacroarea: 17, fp: 1 },
	{ idUso: 2, idMacroarea: 18, fp: 1 },
	// PIU Central — área 1 (Q2) e progressão temporal do Decreto
	{ idArea: 1, dataInicio: '2024-08-19', dataFim: '2027-08-19', fp: 0.35 },
	{ idArea: 1, dataInicio: '2027-08-20', dataFim: '2029-08-19', fp: 0.56 },
	{ idArea: 1, dataInicio: '2029-08-20', fp: 0.7 },
	{ idArea: 2, dataInicio: '2024-08-19', dataFim: '2027-08-19', fp: 0.15 },
	{ idArea: 2, dataInicio: '2027-08-20', dataFim: '2029-08-19', fp: 0.2 },
	{ idArea: 2, dataInicio: '2029-08-20', fp: 0.25 },
	{ idArea: 3, dataInicio: '2024-08-19', dataFim: '2027-08-19', fp: 0.05 },
	{ idArea: 3, dataInicio: '2027-08-20', dataFim: '2029-08-19', fp: 0.1 },
	{ idArea: 3, dataInicio: '2029-08-20', fp: 0.1 },
	{ idArea: 4, dataInicio: '2024-08-19', dataFim: '2027-08-19', fp: 0 },
	{ idArea: 4, dataInicio: '2027-08-20', dataFim: '2029-08-19', fp: 0 },
	{ idArea: 4, dataInicio: '2029-08-20', fp: 0.5 },
	{ idArea: 5, dataInicio: '2024-08-19', dataFim: '2027-08-19', fp: 0 },
	{ idArea: 5, dataInicio: '2027-08-20', dataFim: '2029-08-19', fp: 0 },
	{ idArea: 5, dataInicio: '2029-08-20', fp: 0.4 },
	{ idArea: 6, dataInicio: '2024-08-19', dataFim: '2027-08-19', fp: 0.45 },
	{ idArea: 6, dataInicio: '2027-08-20', dataFim: '2029-08-19', fp: 0.72 },
	{ idArea: 6, dataInicio: '2029-08-20', fp: 0.9 },
	{ idArea: 7, dataInicio: '2024-08-19', dataFim: '2027-08-19', fp: 0.25 },
	{ idArea: 7, dataInicio: '2027-08-20', dataFim: '2029-08-19', fp: 0.4 },
	{ idArea: 7, dataInicio: '2029-08-20', fp: 0.5 },
	{ idArea: 8, dataInicio: '2024-08-19', dataFim: '2027-08-19', fp: 0.3 },
	{ idArea: 8, dataInicio: '2027-08-20', dataFim: '2029-08-19', fp: 0.75 },
	{ idArea: 8, dataInicio: '2029-08-20', fp: 0.75 },
];

/** aba `fs` (tbl_fs) — Fator Social, por tipologia. */
export const FS: { idTipologia: number; fs: number }[] = [
	{ idTipologia: 1, fs: 0 },
	{ idTipologia: 2, fs: 0.4 },
	{ idTipologia: 3, fs: 0.6 },
	{ idTipologia: 4, fs: 0.8 },
	{ idTipologia: 5, fs: 0.9 },
	{ idTipologia: 6, fs: 1 },
	{ idTipologia: 7, fs: 0.8 },
	{ idTipologia: 8, fs: 1 },
	{ idTipologia: 9, fs: 0 },
	{ idTipologia: 10, fs: 0 },
	{ idTipologia: 11, fs: 0 },
	{ idTipologia: 12, fs: 0 },
	{ idTipologia: 13, fs: 0 },
	{ idTipologia: 14, fs: 0 },
	{ idTipologia: 15, fs: 0 },
	{ idTipologia: 16, fs: 0.3 },
	{ idTipologia: 17, fs: 0.3 },
	{ idTipologia: 18, fs: 0.3 },
	{ idTipologia: 19, fs: 0.3 },
	{ idTipologia: 20, fs: 0.7 },
	{ idTipologia: 21, fs: 0.7 },
	{ idTipologia: 22, fs: 0.7 },
	{ idTipologia: 23, fs: 0.7 },
	{ idTipologia: 24, fs: 1 },
];

/** aba `base_cal` — base legal do benefício "doação para alargamento de calçada". */
export const BASE_CAL: ItemTabela[] = [
	{ id: 1, nome: 'artigo 79 da Lei 16.050/2014' },
	{ id: 2, nome: 'artigo 67 da Lei 16.402/2016' },
	{ id: 3, nome: 'artigo 37 da Lei 18.081/2024' },
	{ id: 4, nome: 'artigo 13 da Lei 17.844/2022' },
];

/** aba `base_frui` — base legal do benefício "reserva para fruição pública". */
export const BASE_FRUI: ItemTabela[] = [
	{ id: 1, nome: 'artigo 82 da Lei 16.050/2014' },
	{ id: 2, nome: 'artigo 88 da Lei 16.402/2016' },
];

/** aba `base_mel` — base legal do benefício "doação para melhoramento viário". */
export const BASE_MEL: ItemTabela[] = [
	{ id: 1, nome: 'artigo 81 da Lei 16.050/2014' },
	{ id: 2, nome: 'artigo 12 da Lei 17.844/2022' },
];

/** aba `class_empr` — classificação do empreendimento. */
export const CLASSIFICACAO_EMPREENDIMENTO: { id: number; sigla: string; nome: string }[] = [
	{ id: 1, sigla: 'EHIS', nome: 'Empreendimento de habitação de interesse social' },
	{ id: 2, sigla: 'EHMP', nome: 'Empreendimento de habitação de mercado popular' },
	{ id: 3, sigla: 'EZEIS', nome: 'Empreendimento em zona especial de interesse social' },
];

/** aba `areas` (tbl_aiu) — áreas de qualificação/transformação do PIU Central, usadas em `id_area_aiu`. */
export const AREAS_AIU: { id: number; tipo: 'Qualificação' | 'Transformação'; area: string }[] = [
	{ id: 1, tipo: 'Qualificação', area: 'Q2' },
	{ id: 2, tipo: 'Qualificação', area: 'Q3' },
	{ id: 3, tipo: 'Qualificação', area: 'Q4' },
	{ id: 4, tipo: 'Qualificação', area: 'Q8a' },
	{ id: 5, tipo: 'Qualificação', area: 'Q8b' },
	{ id: 6, tipo: 'Transformação', area: 'T2a' },
	{ id: 7, tipo: 'Transformação', area: 'T2b' },
	{ id: 8, tipo: 'Transformação', area: 'T2c' },
];
