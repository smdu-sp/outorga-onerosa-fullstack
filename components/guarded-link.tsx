/** @format */

'use client';

import NextLink, { type LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import type { AnchorHTMLAttributes } from 'react';
import { useNavigationGuardIntercept } from '@/providers/NavigationGuardProvider';

/**
 * Como `next/link`, mas confirma (modal) antes de navegar quando a página
 * atual tem alterações não salvas (ver `useNavigationGuard`).
 */
export function GuardedLink({
	onNavigate,
	href,
	...props
}: LinkProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
	const router = useRouter();
	const pedirConfirmacao = useNavigationGuardIntercept();
	return (
		<NextLink
			href={href}
			{...props}
			onNavigate={(e) => {
				const bloqueado = pedirConfirmacao(() => router.push(href.toString()));
				if (bloqueado) {
					e.preventDefault();
					return;
				}
				onNavigate?.(e);
			}}
		/>
	);
}
