/** @format */

'use client';

import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
	BarChart3,
	BookLock,
	Calculator,
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
	badge?: number;
	subItens?: ISubMenu[];
}

export interface ISubMenu {
	titulo: string;
	url: string;
}

function montarMenuUsuario(processosNovos: number): IMenu[] {
	return [
		{
			icone: House,
			titulo: 'Página Inicial',
			url: '/',
		},
		{
			icone: FolderOpen,
			titulo: 'Processos',
			url: '/processos',
			badge: processosNovos > 0 ? processosNovos : undefined,
		},
		{
			icone: BarChart3,
			titulo: 'Relatórios',
			url: '/relatorios',
		},
	];
}

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

function montarMenuDev(usuarioDev: boolean): IMenu[] {
	const itens: IMenu[] = [];
	if (process.env.NODE_ENV === 'development') {
		itens.push({ icone: Terminal, titulo: 'Dev Logs', url: '/dev-logs' });
	}
	// Gate real (não é só NODE_ENV) — o flag Usuario.dev vale em qualquer ambiente.
	if (usuarioDev) {
		itens.push({ icone: Calculator, titulo: 'Cálculo OODC (teste)', url: '/dev-calculo-oodc' });
	}
	return itens;
}

export default function Main({
	override = false,
	children,
	processosNovos = 0,
	usuarioDev = false,
}: {
	override?: boolean;
	children?: ReactNode;
	processosNovos?: number;
	usuarioDev?: boolean;
}) {
	return override ? (
		children
	) : (
		<SidebarProvider
			style={{ '--sidebar-width': '244px' } as CSSProperties}
			className="min-h-svh bg-app-background">
			<AppSidebar
				data={{
					menuUsuario: montarMenuUsuario(processosNovos),
					menuAdmin,
					menuDev: montarMenuDev(usuarioDev),
				}}
			/>
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
