'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ComponentProps } from 'react';

export function ThemeProvider({
	children,
	...props
}: ComponentProps<typeof NextThemesProvider>) {
	// React 19 avisa ao renderizar <script> executável em Client Components.
	// No SSR o script roda normalmente (evita FOUC); no cliente vira data block
	// (application/json) e o aviso some — o tema já foi aplicado no HTML.
	// https://github.com/pacocoursey/next-themes/issues/385
	const scriptProps =
		typeof window === 'undefined'
			? props.scriptProps
			: { ...props.scriptProps, type: 'application/json' as const };

	return (
		<NextThemesProvider
			defaultTheme='system'
			{...props}
			scriptProps={scriptProps}>
			{children}
		</NextThemesProvider>
	);
}
