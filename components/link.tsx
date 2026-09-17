'use client'

import NextLink, { LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SidebarMenuButton } from "./ui/sidebar";
import { useNavigationGuardIntercept } from "@/providers/NavigationGuardProvider";

export default function Link({ className, ...props }: LinkProps & React.HTMLAttributes<HTMLAnchorElement>) {
    const pathname = usePathname();
    const router = useRouter();
    const isCurrentPath = pathname === props.href;
    const pedirConfirmacao = useNavigationGuardIntercept();
    return <SidebarMenuButton asChild className={`transition-all ease-linear duration-200 active:shadow-lg ${
        isCurrentPath ? 'bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground active:bg-primary/90 active:primary-foreground active:text-primary-foreground'
        : 'bg-transparent'
        } ${className}`}>
        <NextLink
            {...props}
            onNavigate={(e) => {
                const bloqueado = pedirConfirmacao(() => router.push(props.href.toString()));
                if (bloqueado) e.preventDefault();
            }}
        />
    </SidebarMenuButton>
}
