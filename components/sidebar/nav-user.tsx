/** @format */

'use client';

import { BadgeCheck, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { signOut, useSession } from 'next-auth/react';

export function NavUser() {
	const { setTheme, theme } = useTheme();
	const session = useSession();

	function abreviaNome(nome: string): string {
		const nomes = nome.split(' ');
		return `${nomes[0].substring(0, 1)}${nomes[nomes.length - 1].substring(0, 1)}`;
	}

	function reduzNome(nome: string): string {
		if (nome.length <= 20) return nome;
		const nomes = nome.split(' ');
		return `${nomes[0]} ${nomes[nomes.length - 1]}`;
	}

	if (!session?.data?.usuario) return null;

	const usuario = session.data.usuario;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="h-auto rounded-lg px-0 py-0 hover:bg-transparent data-[state=open]:bg-accent">
							<div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
								{abreviaNome(usuario.nome)}
							</div>
							<div className="flex min-w-0 flex-1 flex-col leading-[1.2]">
								<span className="truncate text-[13px] font-semibold">
									{reduzNome(usuario.nome)}
								</span>
								<span className="truncate text-[11px] text-muted-foreground">
									DEUSO · SMUL
								</span>
							</div>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="min-w-56 w-[--radix-dropdown-menu-trigger-width] rounded-lg"
						side="top"
						align="center"
						sideOffset={8}>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
									{abreviaNome(usuario.nome)}
								</div>
								<div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{reduzNome(usuario.nome)}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{usuario.email}
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
							<DropdownMenuItem
								onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
								{theme === 'dark' ? <Sun /> : <Moon />}
								Alternar tema
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={async () => {
								await signOut({ redirect: true, redirectTo: '/login' });
							}}>
							<LogOut className="text-destructive" />
							Sair
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
