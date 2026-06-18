import { IPermissao } from "./permissao";
import { IUsuario } from "./usuario";

export interface IGrupoPermissao {
    id: string;
    nome: string;
    
    criado_em: Date;
    alterado_em: Date;

    permissoes?: IPermissao[];
    usuarios?: IUsuario[];
}

export interface IPaginadoGrupoPermissao {
    data: IGrupoPermissao[];
    total: number;
    pagina: number;
    limite: number;
}

export interface ICreateGrupoPermissao {
    nome: string;
    permissoes?: string[];
}

export interface IUpdateGrupoPermissao extends Partial<ICreateGrupoPermissao> {}

export interface IRespostaGrupoPermissao {
    ok: boolean;
    error: string | null;
    data: IPaginadoGrupoPermissao | IGrupoPermissao | IGrupoPermissao[] | { desativado: boolean } | Record<string, unknown> | null;
    status: number;
}