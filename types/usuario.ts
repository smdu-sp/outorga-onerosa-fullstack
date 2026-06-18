/** @format */

import { IGrupoPermissao } from "./grupo-permissao";
import { IPermissao } from "./permissao";

export interface IUsuario {
	id: string;
	nome: string;
	login: string;
	email: string;
	permissoes: IPermissao[];
	grupos: IGrupoPermissao[];
	avatar?: string;
	status: boolean;
	ultimologin: Date;
	criadoEm: Date;
	atualizadoEm?: Date;
}

export interface ICreateUsuario {
	nome: string;
	email: string;
	login: string;
	avatar?: string;
	permissoes?: string[];
	grupos?: string[];
}

export interface IUpdateUsuario {
	id?: string;
	status?: boolean;
	avatar?: string;
	permissoes?: string[];
	grupos?: string[];
}

export interface IPaginadoUsuario {
	data: IUsuario[];
	total: number;
	pagina: number;
	limite: number;
}

export interface INovoUsuario {
	login: string;
	nome: string;
	email: string;
}

export interface IRespostaUsuario {
	ok: boolean;
	error: string | null;
	data: INovoUsuario | IUsuario | IUsuario[] | IPaginadoUsuario | { autorizado: boolean } | { desativado: boolean } | Record<string, unknown> | null;
	status: number;
}

export interface IUsuarioSession {
	sub: string
	nome: string
	login: string
	email: string
	permissao: string
	status: number,
	avatar?: string
	iat: number,
	exp: number
}
