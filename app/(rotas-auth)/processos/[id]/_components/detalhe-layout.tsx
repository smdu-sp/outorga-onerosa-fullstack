'use client';

import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { useEffect, useState } from 'react';
import { DetalheHeader } from './detalhe-header';
import { DetalhePainel } from './detalhe-painel';
import { DetalheVnav } from './detalhe-vnav';
import { filtrarNavPorBusca } from './detalhe-nav';

export default function DetalheLayout({ processo }: { processo: IProcessoDetalhe }) {
	const [detalhe, setDetalhe] = useState(processo);
	const [activeId, setActiveId] = useState('processo');
	const [busca, setBusca] = useState('');

	useEffect(() => {
		setDetalhe(processo);
	}, [processo]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
				e.preventDefault();
				document.querySelector<HTMLInputElement>('[data-detalhe-busca]')?.focus();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, []);

	useEffect(() => {
		const grupos = filtrarNavPorBusca(busca);
		const ids = grupos.flatMap((g) => g.itens.map((i) => i.id));
		if (ids.length > 0 && !ids.includes(activeId)) {
			setActiveId(ids[0]);
		}
	}, [busca, activeId]);

	return (
		<div className="mx-auto w-full max-w-[1240px] pb-10">
			<DetalheHeader
				processo={detalhe}
				busca={busca}
				onBusca={setBusca}
				onDetalheAtualizado={setDetalhe}
			/>

			<div className="flex flex-col gap-5 lg:flex-row lg:items-start">
				<DetalheVnav
					activeId={activeId}
					onSelect={setActiveId}
					detalhe={detalhe}
					busca={busca}
				/>
				<DetalhePainel
					secaoId={activeId}
					detalhe={detalhe}
					onDetalheAtualizado={setDetalhe}
				/>
			</div>
		</div>
	);
}
