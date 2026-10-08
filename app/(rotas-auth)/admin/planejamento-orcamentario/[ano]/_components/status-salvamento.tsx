/** @format */

'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Check, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'salvo' | 'alterado';

const StatusSalvamentoContext = createContext<(dirty: boolean) => void>(() => {});

/** Envolve o header + o formulário para que o badge no header reflita o estado do form. */
export function StatusSalvamentoProvider({ children }: { children: ReactNode }) {
	const [dirty, setDirty] = useState(false);
	return (
		<StatusSalvamentoContext.Provider value={setDirty}>
			<StatusSalvamentoDirtyBridge dirty={dirty}>{children}</StatusSalvamentoDirtyBridge>
		</StatusSalvamentoContext.Provider>
	);
}

// Só existe para repassar `dirty` a `BadgeSalvamento` via contexto de leitura separado,
// mantendo `setDirty` estável para quem chama `useReportarAlteracoes`.
const StatusLeituraContext = createContext<Status>('salvo');

function StatusSalvamentoDirtyBridge({ dirty, children }: { dirty: boolean; children: ReactNode }) {
	return (
		<StatusLeituraContext.Provider value={dirty ? 'alterado' : 'salvo'}>
			{children}
		</StatusLeituraContext.Provider>
	);
}

/** Chame no formulário com o `dirty` atual (alterações não salvas). */
export function useReportarAlteracoes(dirty: boolean) {
	const setDirty = useContext(StatusSalvamentoContext);
	useEffect(() => {
		setDirty(dirty);
		return () => setDirty(false);
	}, [dirty, setDirty]);
}

/** Badge "Salvo" / "Alterações não salvas" — use no `actions` do `PageHeader`. */
export function BadgeSalvamento() {
	const status = useContext(StatusLeituraContext);
	const salvo = status === 'salvo';
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
				salvo ? 'bg-success-soft text-success' : 'bg-warning-soft text-[oklch(0.5_0.13_70)]',
			)}>
			{salvo ? <Check className="size-3.5" /> : <PenLine className="size-3.5" />}
			{salvo ? 'Salvo' : 'Alterações não salvas'}
		</span>
	);
}
