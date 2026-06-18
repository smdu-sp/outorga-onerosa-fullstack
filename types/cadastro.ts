/** @format */

export interface IPaginadoCadastros {
	data: ICadastros[];
	total: number;
	pagina: number;
	limite: number;
}

export interface IAssuntos {
	id_prata_assunto: number;
	id_prata_processo?: number;
	sistema?: string;
	processo?: string;
	protocolo?: string;
	codigoAssunto?: string;
	dtInclusaoAssunto?: Date;
	assuntoCod?: string;
	assunto?: string;
	aditivo?: string;
	tipoRequerimento?: string;
	situacaoAssunto?: string;
	numDocIrregularidade?: string;
	dtEmissaoDocumento?: Date;
	statusDocumento?: string;
	subprefeitura?: string;
	distrito?: string;
	dtcarga?: Date;

	cadastro?: ICadastros;
}

export interface IEnderecos {
	id_prata_endereco: number;
	id_prata_assunto: number;
	sistema?: string;
	processo?: string;
	protocolo?: string;
	codigoAssunto?: string;
	codlog?: string;
	logradouro?: string;
	numero?: string;
	bairro?: string;
	cep?: string;
	subprefeitura?: string;
	distrito?: string;
	dtcarga?: Date;
	complemento?: string;
}

export interface ICadastros {
	id_prata_sql_incra: number;
	id_prata_assunto: number;
	sistema?: string;
	processo?: string;
	protocolo?: string;
	codigoAssunto?: string;
	sql_incra?: string;
	tipoSql_incra?: string;
	dtcarga?: Date;

	assunto?: IAssuntos;
	endereco?: IEnderecos;
}

export interface IListaSql {
	sql: string;
	processos?: {
		processo?: string;
		sistema?: string;
		assunto?: string;
		situacao?: string;
		dataInclusao?: string;
		dataEncerramento?: string;
	}[];
}
