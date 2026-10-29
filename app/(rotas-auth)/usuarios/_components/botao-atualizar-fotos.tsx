/** @format */

'use client';

import { Button } from '@/components/ui/button';
import * as usuario from '@/services/usuario';
import { ImageIcon, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

interface ResultadoAtualizarFotos {
	total: number;
	atualizados: number;
	semFoto: number;
	falhas: number;
}

export default function BotaoAtualizarFotos() {
	const { data: session } = useSession();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	if (!session?.usuario?.dev) return null;

	function handleClick() {
		startTransition(async () => {
			const resp = await usuario.atualizarFotos();
			if (resp.error) {
				toast.error('Algo deu errado', { description: resp.error });
				return;
			}
			const r = resp.data as unknown as ResultadoAtualizarFotos;
			toast.success('Busca de fotos concluída', {
				description: `${r.atualizados} atualizada(s) · ${r.semFoto} sem foto · ${r.falhas} falha(s) (de ${r.total}).`,
			});
			router.refresh();
		});
	}

	return (
		<Button
			variant='outline'
			className='gap-2'
			disabled={isPending}
			onClick={handleClick}>
			{isPending ? (
				<Loader2 className='size-4 animate-spin' />
			) : (
				<ImageIcon className='size-4' />
			)}
			Atualizar fotos
		</Button>
	);
}
