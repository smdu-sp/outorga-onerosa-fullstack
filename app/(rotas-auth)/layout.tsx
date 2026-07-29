import Main from "@/components/main";
import { auth } from "@/lib/auth/auth";
import { sessaoValida, usuarioPermitido } from "@/lib/auth/session";
import { contarProcessosNovos } from "@/lib/server/processos";
import { redirect } from "next/navigation";

export default async function RotasAuth({children}:{children: React.ReactNode}) {
    const session = await auth();
    if (!sessaoValida(session)) redirect('/login');

    const userId = session.usuario.sub;
    const podeVerContadorNovos = await usuarioPermitido(userId, 'parcelas_editar');
    const processosNovos = podeVerContadorNovos ? await contarProcessosNovos() : 0;

    return (
        <Main processosNovos={processosNovos} usuarioDev={session.usuario.dev === true}>
            {children}
        </Main>
    );
}