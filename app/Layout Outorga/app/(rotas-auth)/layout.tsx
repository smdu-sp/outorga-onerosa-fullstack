import Main from "@/components/main";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function RotasAuth({children}:{children: React.ReactNode}) {
    const session = await auth();
    if (!session) redirect('/login');
    return <Main>{children}</Main>;
}