/** @format */

import type { Metadata } from 'next';
import './globals.css';
import localFont from 'next/font/local';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';

const myFont = localFont({
	src: './Sora-VariableFont_wght.woff2',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Outorga Onerosa - Relatórios',
	description: 'Relatórios de Outorga Onerosa.',
	icons: ['/public/favicon.ico'],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang='pt-BR'
			suppressHydrationWarning
			className={`${myFont.className} antialised `}>
			<body className={`antialised`}>
				<AuthProvider>
					<ThemeProvider
						attribute='class'
						defaultTheme='system'
						enableSystem
						disableTransitionOnChange>
						{children}
						<Toaster richColors />
					</ThemeProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
