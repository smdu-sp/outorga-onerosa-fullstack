/** @format */

'use client';
import { PageHeader, PageShell, SectionCard } from '@/components/page-shell';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import React from 'react';

export default function Perfil() {
	const { data: session } = useSession();
	return (
		<PageShell max='narrow'>
			<PageHeader title='Perfil' />
			<SectionCard>
				<Avatar className='h-40 w-40'>
					<AvatarImage src={session?.usuario.avatar} alt='name'></AvatarImage>
				</Avatar>
			</SectionCard>
		</PageShell>
	);
}
