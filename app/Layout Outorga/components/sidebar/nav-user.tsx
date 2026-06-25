/** @format */

'use client';

import { BadgeCheck, ChevronsUpDown, LogOut } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar';
import { signOut, useSession } from 'next-auth/react';
// import { useRouter } from "next/navigation";

export function NavUser() {
	const { isMobile } = useSidebar();
	// const router = useRouter();
	const session = useSession();

	function abreviaNome(nome: string): string {
		const nomes = nome.split(' ');
		return `${nomes[0].substring(0, 1)}${nomes[nomes.length - 1].substring(
			0,
			1,
		)}`;
	}

	function reduzNome(nome: string): string {
		if (nome.length <= 20) return nome;
		const nomes = nome.split(' ');
		return `${nomes[0]} ${nomes[nomes.length - 1]}`;
	}

	return (
		session &&
		session.data &&
		session.data.usuario && (
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size='lg'
								className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'>
								<Avatar className='h-8 w-8 rounded-full aspect-square'>
									<AvatarImage src={session.data.usuario.avatar} />
									<AvatarFallback className='rounded-full'>
										{abreviaNome(session.data.usuario.nome)}
									</AvatarFallback>
								</Avatar>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-semibold'>
										{reduzNome(session.data.usuario.nome)}
									</span>
								</div>
								<ChevronsUpDown className='ml-auto size-4' />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
							side={isMobile ? 'bottom' : 'top'}
							align='center'
							sideOffset={4}>
							<DropdownMenuLabel className='p-0 font-normal'>
								<div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
									<Avatar className='h-8 w-8 rounded-full aspect-square'>
										<AvatarImage src={session.data.usuario.avatar} />
										<AvatarFallback className='rounded-full'>
											{abreviaNome(session.data.usuario.nome)}
										</AvatarFallback>
									</Avatar>
									<div className='grid flex-1 text-left text-sm leading-tight'>
										<span className='truncate font-semibold'>
											{reduzNome(session.data.usuario.nome)}
										</span>
										<span className='truncate text-xs'>
											{session.data.usuario.email}
										</span>
									</div>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem>
									<BadgeCheck />
									Minha conta
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant='destructive'
								onClick={async () => {
									await signOut({ redirect: true, redirectTo: '/login' });
								}}>
								<LogOut className='text-destructive' />
								Sair
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
		)
	);
}
