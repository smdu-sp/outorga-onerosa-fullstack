"use client"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar"
import MiniLogo from "./mini-logo"
import { ComponentProps } from "react"
import { IMenu } from "../main"
import { ArrowLeftFromLineIcon } from "lucide-react"

export function AppSidebar({ data, props }: { data: { menuUsuario: IMenu[], menuAdmin: IMenu[] }, props?: ComponentProps<typeof Sidebar>}) {
  const { toggleSidebar } = useSidebar();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={toggleSidebar}>
                <MiniLogo />
                <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                        Outorga Onerosa
                    </span>
                    <span className="truncate text-xs">Relatórios</span>
                </div>
                <ArrowLeftFromLineIcon />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <NavMain data={data} />
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
