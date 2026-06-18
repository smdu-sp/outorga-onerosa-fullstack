import { IGrupoPermissao } from "./grupo-permissao"

export interface IPaginadoPermissoes {
    total: number
    pagina: number
    limite: number
    data?: IPermissao[]
}

export interface IPermissao {
    id: string
    permissao: string
    nome: string

    grupos?: IGrupoPermissao[]

    criado_em: Date
    alterado_em: Date
}

export interface IRespostaPermissao {
    ok: boolean;
    error: string | null;
    data: IPermissao | IPermissao[] | { desativado: boolean } | IPaginadoPermissoes | Record<string, unknown> | null;
    status: number;
}

export interface ICreatePermissao {
    nome: string;
    permissao: string;
    grupos?: string[];
}

export interface IUpdatePermissao extends Partial<ICreatePermissao> {}