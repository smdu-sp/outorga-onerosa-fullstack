/** @format */

'use client';

import { AppSidebar } from '@/components/sidebar/app-sidebar';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@/components/ui/sidebar';
import {
	BookLock,
	FolderOpen,
	House,
	Lock,
	LucideProps,
	Users,
} from 'lucide-react';
import { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import { DrawerMenu } from './drawer-menu';
import { ModeToggle } from './toggle-theme';

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
		<>
			<ModeToggle className='absolute top-4 right-4 z-50' />
			<SidebarProvider>
				<AppSidebar data={{ menuUsuario, menuAdmin }} />
				<SidebarInset>
					<header className='h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 hidden sm:flex'>
						<div className='flex items-center gap-2 px-4'>
							<SidebarTrigger className='-ml-1 md:hidden' />
							<Separator
								orientation='vertical'
								className='mr-2 h-4 md:ml-[-16px]'
							/>
							<Breadcrumb>
								<BreadcrumbList>
									<BreadcrumbItem className='hidden md:block'>
										<House size={16} />
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
						</div>
					</header>
					<div className='flex flex-1 flex-col gap-4 p-4 sm:pt-0 relative items-center w-full'>
						<div className='min-h-100 w-full max-w-7xl flex-1 md:min-h-min pt-10 sm:pt-0'>
							{children}
						</div>
					</div>
				</SidebarInset>
				<DrawerMenu data={{ menuUsuario, menuAdmin }} />
			</SidebarProvider>
		</>
	);
}
