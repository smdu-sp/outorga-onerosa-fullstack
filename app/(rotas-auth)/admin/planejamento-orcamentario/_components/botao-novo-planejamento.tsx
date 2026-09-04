/** @format */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BotaoNovoPlanejamento({ anoSugerido }: { anoSugerido: number }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [ano, setAno] = useState(anoSugerido);

	function irParaAno() {
		setOpen(false);
		router.push(`/admin/planejamento-orcamentario/${ano}`);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="h-4 w-4" />
					Gerar planejamento
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Gerar planejamento</DialogTitle>
					<DialogDescription>
						Informe o ano a planejar. Se já existir um planejamento para o ano, você vai poder
						revisá-lo e editá-lo (respeitando o prazo de edição).
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2">
					<Label htmlFor="ano-planejamento">Ano</Label>
					<Input
						id="ano-planejamento"
						type="number"
						value={ano}
						onChange={(e) => setAno(Number(e.target.value))}
					/>
				</div>
				<DialogFooter>
					<Button onClick={irParaAno}>Continuar</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
