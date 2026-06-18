"use client"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import MiniLogo from "./mini-logo"
import { ComponentProps } from "react"
import { IMenu } from "../main"

export function AppSidebar({
  data,
  props,
}: {
  data: { menuUsuario: IMenu[]; menuAdmin: IMenu[] }
  props?: ComponentProps<typeof Sidebar>
}) {
  return (
    <Sidebar
      className="border-r border-sidebar-border bg-sidebar"
      {...props}>
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 px-3.5 py-3.5">
              <MiniLogo />
              <div className="flex min-w-0 flex-col leading-[1.15]">
                <span className="truncate text-[13px] font-semibold text-foreground">
                  Outorga Onerosa
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  Relatórios
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <NavMain data={data} />
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
