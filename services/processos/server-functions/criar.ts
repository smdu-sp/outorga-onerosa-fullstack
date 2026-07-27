/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { criarProcesso } from '@/lib/server/processos';
import { redirect } from 'next/navigation';
import { IRespostaProcesso, ICreateProcesso } from '@/types/processo';

export async function criar(data: ICreateProcesso): Promise<IRespostaProcesso> {
	try {
		const session = await requirePermissao('processos_criar');
		// Este endpoint atende o fluxo antigo (busca GeoSampa/SQL), agora exclusivo do Admin.
		await requirePermissao('processos_criar_geosampa');
		const novoProcesso = await criarProcesso(data, session.usuario.sub);
		return { ok: true, error: null, data: novoProcesso, status: 201 };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Erro ao criar processo.';
		if (message.includes('login')) redirect('/login');
		return { ok: false, error: message, data: null, status: 400 };
	}
}
