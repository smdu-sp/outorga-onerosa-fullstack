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
import Link from '../link';
import { IMenu } from '../main';

function useIsActive(url?: string): boolean {
	const pathname = usePathname();
	if (!url) return false;
	if (url === '/') return pathname === '/';
	return pathname === url || pathname.startsWith(url + '/');
}

function NavItems({ items }: { items: IMenu[] }) {
	return (
		<SidebarMenu>
			{items.map((item) =>
				item.subItens ? (
					<Collapsible
						key={item.titulo}
						asChild
						defaultOpen={useIsActive(item.url)}
						className="group/collapsible">
						<SidebarMenuItem>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton tooltip={item.titulo}>
									{item.icone && <item.icone />}
									<span>{item.titulo}</span>
									<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
								</SidebarMenuButton>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<SidebarMenuSub>
									{item.subItens?.map((subItem) => (
										<SidebarMenuSubItem key={subItem.titulo}>
											<SidebarMenuSubButton asChild isActive={useIsActive(subItem.url)}>
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
							isActive={useIsActive(item.url)}>
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

export function NavMain({ data }: { data: { menuUsuario?: IMenu[]; menuAdmin?: IMenu[] } }) {
	return (
		<SidebarContent>
			<SidebarGroup>
				{data.menuUsuario && data.menuUsuario.length > 0 && (
					<>
						<SidebarGroupLabel>Geral</SidebarGroupLabel>
						<NavItems items={data.menuUsuario} />
					</>
				)}
				{data.menuAdmin && data.menuAdmin.length > 0 && (
					<>
						<SidebarGroupLabel className="mt-2">Administração</SidebarGroupLabel>
						<NavItems items={data.menuAdmin} />
					</>
				)}
			</SidebarGroup>
		</SidebarContent>
	);
}
