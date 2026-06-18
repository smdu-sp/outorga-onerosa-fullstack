/** @format */

'use server';

import { requirePermissao } from '@/lib/auth/session';
import { importarProcessos } from '@/lib/server/processos';
import { redirect } from 'next/navigation';
import { IRespostaProcesso, IProcesso } from '@/types/processo';

export async function importar(data: IProcesso[]): Promise<IRespostaProcesso> {
	try {
		await requirePermissao('processos_importar');
		const resultado = await importarProcessos(data as Parameters<typeof importarProcessos>[0]);
		return { ok: true, error: null, data: resultado, status: 201 };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Erro ao importar processos.';
		if (message.includes('login')) redirect('/login');
		return { ok: false, error: message, data: null, status: 400 };
	}
}
