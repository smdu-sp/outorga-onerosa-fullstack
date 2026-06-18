'use client'

import {
    Pagination as ShadPagination,
    PaginationContent,
    PaginationItem,
    PaginationLink
} from "@/components/ui/pagination"
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./ui/select";

function retornaPaginas(pagina: number, limite: number, total: number): number[] {
    const ultimaPagina = Math.ceil(total / limite);
    if (pagina > ultimaPagina) pagina = ultimaPagina;
    if (ultimaPagina <= 1) return [1];
    if (ultimaPagina <= 2) return [1, 2];
    if (ultimaPagina <= 3 || (pagina <= 3 && pagina !== 3)) return [1, 2, 3];
    if (pagina < ultimaPagina) return [pagina - 1, pagina, pagina + 1];
    return [pagina - 2, pagina - 1, pagina];
}

export default function Pagination(props: { total: number, pagina: number, limite: number, success?: boolean }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const limites = [5, 10, 15, 20, 50];

    const total = props.total || +(searchParams.get('total') || 0);
    const [pagina, setPagina] = useState(props.pagina || +(searchParams.get('pagina') || 1));
    const [limite, setLimite] = useState(props.limite || +(searchParams.get('limite') || 10));
    const [paginas, setPaginas] = useState(retornaPaginas(pagina, limite, total));

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('pagina', String(pagina));
        params.set('limite', String(limite));
        params.set('total', String(total));
        router.push(pathname + '?' + params.toString(), { scroll: false });
        setPaginas(retornaPaginas(pagina, limite, total));
    }, [pagina, limite, searchParams, pathname, total, router]);

    return paginas.length > 0 && (
        <ShadPagination>
            <div className="w-[120px] hidden md:block text-xs">{(limite*(pagina-1))+1} a {limite*pagina < total ? limite*pagina : total} de {total}</div>
            <PaginationContent>
                {!paginas.includes(1) && <PaginationItem>
                    <PaginationLink onClick={() => setPagina(1)}><ChevronsLeftIcon /></PaginationLink>
                </PaginationItem>}
                {pagina > 1 && <PaginationItem>
                    <PaginationLink onClick={() => setPagina(pagina - 1)}><ChevronLeftIcon /></PaginationLink>
                </PaginationItem>}
                {paginas.map((paginaMap) => <PaginationItem key={paginaMap}>
                    <PaginationLink onClick={() => setPagina(paginaMap)} isActive={paginaMap === pagina}>{paginaMap}</PaginationLink>
                </PaginationItem>)}
                {pagina < Math.ceil(total / limite) && <PaginationItem>
                    <PaginationLink onClick={() => setPagina(pagina + 1)}><ChevronRightIcon /></PaginationLink>
                </PaginationItem>}
                {!paginas.includes(Math.ceil(total / limite)) && <PaginationItem>
                    <PaginationLink  onClick={() => setPagina(Math.ceil(total / limite))}><ChevronsRightIcon /></PaginationLink>
                </PaginationItem>}
            </PaginationContent>
            <Select
                value={limite.toString()}
                onValueChange={(value) => {
                    setLimite(+value);
                }}
            >
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Registros" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Registros</SelectLabel>
                        {limites.map((limiteMap) => 
                            <SelectItem 
                                key={limiteMap}
                                value={limiteMap.toString()}
                                
                            >{limiteMap}</SelectItem>
                        )}
                        {((total > limites[limites.length - 1] && total < 1000) || limites.length < 1)&& <SelectItem value={total.toString()}>Todos</SelectItem>}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </ShadPagination>
    )
}