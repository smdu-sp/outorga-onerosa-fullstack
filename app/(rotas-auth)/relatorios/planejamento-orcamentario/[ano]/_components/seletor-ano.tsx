/** @format */

'use client';

import { useRouter } from 'next/navigation';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

export function SeletorAno({ ano, anosDisponiveis }: { ano: number; anosDisponiveis: number[] }) {
	const router = useRouter();
	const anos = anosDisponiveis.includes(ano) ? anosDisponiveis : [ano, ...anosDisponiveis];

	return (
		<Select value={String(ano)} onValueChange={(v) => router.push(`/relatorios/planejamento-orcamentario/${v}`)}>
			<SelectTrigger className="w-32">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{anos.map((a) => (
					<SelectItem key={a} value={String(a)}>
						{a}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
