/** @format */

'use server';

import { auth } from '@/lib/auth/auth';
import { IRespostaProcesso } from '@/types/processo';

export async function buscarPorId(id: string): Promise<IRespostaProcesso> {
	const baseURL = process.env.NEXT_PUBLIC_API_URL;
	const session = await auth();
	try {
		const response = await fetch(`${baseURL}processos/buscar-por-id/${id}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session?.access_token}`,
			},
		});
		const data = await response.json();
		if (response.status === 200)
			return { ok: true, error: null, data, status: 200 };
		return { ok: false, error: data.message, data: null, status: data.statusCode };
	} catch (error) {
		return {
			ok: false,
			error: 'Não foi possível buscar o processo: ' + error,
			data: null,
			status: 400,
		};
	}
}
