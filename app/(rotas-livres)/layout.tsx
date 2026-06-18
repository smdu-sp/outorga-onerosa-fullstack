import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { sessaoValida } from "@/lib/auth/session";

export default async function RotasLivres({children}:{children: React.ReactNode}) {
  const session = await auth();
  if (sessaoValida(session)) redirect('/');
  return <>{children}</>;
}
