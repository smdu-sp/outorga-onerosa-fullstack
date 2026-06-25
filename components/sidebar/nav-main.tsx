'use client';

import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import Link from '../link';
import { IMenu } from '../main';

const navButtonClass =
	'h-auto rounded-lg px-2.5 py-2 text-[13.5px] hover:bg-accent hover:text-foreground data-[active=true]:bg-primary data-[active=true]:font-medium data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground [&>svg]:size-[17px] [&>svg]:opacity-85';

function isActive(pathname: string, url?: string): boolean {
	if (!url) return false;
	if (url === '/') return pathname === '/';
	return pathname === url || pathname.startsWith(url + '/');
}

function NavItems({ items }: { items: IMenu[] }) {
	const pathname = usePathname();
	return (
		<SidebarMenu className="gap-0.5">
			{items.map((item) =>
				item.subItens ? (
					<Collapsible
						key={item.titulo}
						asChild
						defaultOpen={isActive(pathname, item.url)}
						className="group/collapsible">
						<SidebarMenuItem>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton tooltip={item.titulo} className={navButtonClass}>
									{item.icone && <item.icone />}
									<span>{item.titulo}</span>
									<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
								</SidebarMenuButton>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<SidebarMenuSub>
									{item.subItens?.map((subItem) => (
										<SidebarMenuSubItem key={subItem.titulo}>
											<SidebarMenuSubButton
												asChild
												isActive={isActive(pathname, subItem.url)}>
												<Link href={subItem.url}>
													<span>{subItem.titulo}</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									))}
								</SidebarMenuSub>
							</CollapsibleContent>
						</SidebarMenuItem>
					</Collapsible>
				) : (
					<SidebarMenuItem key={item.titulo}>
						<SidebarMenuButton
							asChild
							tooltip={item.titulo}
							isActive={isActive(pathname, item.url)}
							className={navButtonClass}>
							<Link href={item.url || '#'}>
								{item.icone && <item.icone />}
								<span>{item.titulo}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				),
			)}
		</SidebarMenu>
	);
}

export function NavMain({
	data,
}: {
	data: { menuUsuario?: IMenu[]; menuAdmin?: IMenu[]; menuDev?: IMenu[] };
}) {
	return (
		<SidebarContent className="px-2 py-3">
			<SidebarGroup className="p-0">
				{data.menuUsuario && data.menuUsuario.length > 0 && (
					<>
						<SidebarGroupLabel className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
							Geral
						</SidebarGroupLabel>
						<NavItems items={data.menuUsuario} />
					</>
				)}
				{data.menuAdmin && data.menuAdmin.length > 0 && (
					<>
						<SidebarGroupLabel
							className={cn(
								'px-2.5 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-normal text-muted-foreground',
								data.menuUsuario?.length && 'mt-2.5',
							)}>
							Administração
						</SidebarGroupLabel>
						<NavItems items={data.menuAdmin} />
					</>
				)}
				{data.menuDev && data.menuDev.length > 0 && (
					<>
						<SidebarGroupLabel
							className={cn(
								'px-2.5 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-normal text-amber-500/70',
								(data.menuUsuario?.length || data.menuAdmin?.length) && 'mt-2.5',
							)}>
							Desenvolvimento
						</SidebarGroupLabel>
						<NavItems items={data.menuDev} />
					</>
				)}
			</SidebarGroup>
		</SidebarContent>
	);
}
