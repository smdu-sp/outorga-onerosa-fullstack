'use client'

import smul_azul from "@/public/smul_azul.png"
import smul_branco from "@/public/smul_branco.png";
import { useTheme } from "next-themes";
import { useEffect, useState } from 'react';
import Image from "next/image";

export default function Logo() {
    const { theme, systemTheme } = useTheme();
    const tema = theme === "system" ? systemTheme : theme;
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    if (!mounted) {
        return <Image
            width={1200}
            height={1200}
            src={"/asdasdasdas.png"}
            alt="SMUL LOGO"
        />
    }

    return <Image
        width={1200}
        height={1200}
        src={tema === "dark" ? smul_branco.src : smul_azul.src}
        alt="SMUL LOGO"
    />
}