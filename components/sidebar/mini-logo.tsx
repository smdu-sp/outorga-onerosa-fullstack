'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import claro from '@/public/smul_icone_azul.png';
import escuro from '@/public/smul_icone_branco.png';

export default function MiniLogo() {
	const { theme, systemTheme } = useTheme();
	const tema = theme === 'system' ? systemTheme : theme;
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<div className="grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-soft" />
		);
	}

	return (
		<div className="grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-soft p-1">
			<Image
				width={1200}
				height={1200}
				src={tema === 'dark' ? escuro.src : claro.src}
				alt="SMUL"
				className="h-full w-full object-contain"
			/>
		</div>
	);
}
