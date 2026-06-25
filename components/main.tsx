/** @format */

'use client';

import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
	BarChart3,
	BookLock,
	FolderOpen,
	House,
	Lock,
	LucideProps,
	Terminal,
	Users,
} from 'lucide-react';
import { ForwardRefExoticComponent, ReactNode, RefAttributes, type CSSProperties } from 'react';

export interface IMenu {
	icone: ForwardRefExoticComponent<
		Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
	>;
	titulo: string;
	url?: string;
	permissao?: string;
	subItens?: ISubMenu[];
}

export interface ISubMenu {
	titulo: string;
	url: string;
}

const menuUsuario: IMenu[] = [
	{
		icone: House,
		titulo: 'Página Inicial',
		url: '/',
	},
	{
		icone: FolderOpen,
		titulo: 'Processos',
		url: '/processos',
	},
	{
		icone: BarChart3,
		titulo: 'Relatórios',
		url: '/relatorios',
	},
];

const menuAdmin: IMenu[] = [
	{
		icone: Users,
		titulo: 'Usuários',
		url: '/usuarios',
		permissao: 'usuario_buscar_tudo',
	},
	{
		icone: Lock,
		titulo: 'Permissões',
		url: '/permissoes',
		permissao: 'permissao_buscar_tudo',
	},
	{
		icone: BookLock,
		titulo: 'Grupos de Permissão',
		url: '/grupos-permissao',
		permissao: 'grupo_permissao_buscar_tudo',
	},
];

const menuDev: IMenu[] =
	process.env.NODE_ENV === 'development'
		? [{ icone: Terminal, titulo: 'Dev Logs', url: '/dev-logs' }]
		: [];

export default function Main({
	override = false,
	children,
}: {
	override?: boolean;
	children?: ReactNode;
}) {
	return override ? (
		children
	) : (
		<SidebarProvider
			style={{ '--sidebar-width': '244px' } as CSSProperties}
			className="min-h-svh bg-app-background">
			<AppSidebar data={{ menuUsuario, menuAdmin, menuDev }} />
			<SidebarInset className="bg-app-background">
				<div className="flex min-h-svh flex-col">
					<div className="flex items-center border-b border-border bg-app-background px-4 py-3 md:hidden">
						<SidebarTrigger className="-ml-1" />
						<span className="ml-2 text-sm font-semibold">Outorga Onerosa</span>
					</div>
					<div className="flex flex-1 flex-col">{children}</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
