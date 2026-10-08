/** @format */

'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MENSAGEM_PADRAO = 'Você tem alterações não salvas. Se sair agora, elas serão perdidas.';

interface NavigationGuardContextValue {
	setMensagem: (mensagem: string | null) => void;
	/**
	 * Chame no `onNavigate` de um link. Se houver alterações não salvas, abre o
	 * modal de confirmação e retorna `true` (o chamador deve `preventDefault()`);
	 * ao confirmar, `aoConfirmar` é executado. Retorna `false` quando não há
	 * nada para confirmar — o chamador segue a navegação normalmente.
	 */
	pedirConfirmacao: (aoConfirmar: () => void) => boolean;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue>({
	setMensagem: () => {},
	pedirConfirmacao: () => false,
});

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
	const [mensagem, setMensagem] = useState<string | null>(null);
	const [aoConfirmar, setAoConfirmar] = useState<(() => void) | null>(null);

	useEffect(() => {
		if (!mensagem) return;
		function handler(e: BeforeUnloadEvent) {
			e.preventDefault();
			// Navegadores modernos ignoram a string customizada e mostram um aviso genérico.
			e.returnValue = '';
		}
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [mensagem]);

	const pedirConfirmacao = useCallback(
		(callback: () => void) => {
			if (!mensagem) return false;
			setAoConfirmar(() => callback);
			return true;
		},
		[mensagem],
	);

	const value = useMemo(
		() => ({ setMensagem, pedirConfirmacao }),
		[pedirConfirmacao],
	);

	return (
		<NavigationGuardContext.Provider value={value}>
			{children}
			<AlertDialog
				open={aoConfirmar != null}
				onOpenChange={(open) => {
					if (!open) setAoConfirmar(null);
				}}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
						<AlertDialogDescription>{mensagem ?? MENSAGEM_PADRAO}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setAoConfirmar(null)}>
							Continuar editando
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								aoConfirmar?.();
								setAoConfirmar(null);
							}}>
							Sair sem salvar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</NavigationGuardContext.Provider>
	);
}

/**
 * Chame numa página/formulário com `ativo=true` enquanto houver alterações não
 * salvas. Bloqueia navegação pela sidebar e por `GuardedLink` (modal de
 * confirmação) e fechamento/recarga da aba (aviso nativo do navegador).
 */
export function useNavigationGuard(ativo: boolean, mensagem: string = MENSAGEM_PADRAO) {
	const { setMensagem } = useContext(NavigationGuardContext);

	useEffect(() => {
		setMensagem(ativo ? mensagem : null);
		return () => setMensagem(null);
	}, [ativo, mensagem, setMensagem]);
}

/** Para links de navegação (sidebar, `GuardedLink`) interceptarem a saída. */
export function useNavigationGuardIntercept() {
	return useContext(NavigationGuardContext).pedirConfirmacao;
}
