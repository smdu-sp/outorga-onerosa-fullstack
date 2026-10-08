import { PageHeader, PageShell } from "@/components/page-shell";
import { requireDev } from "@/lib/auth/session";
import { FormCalculoOodc } from "./_components/form-calculo-oodc";

export default async function DevCalculoOodcPage() {
  await requireDev();

  return (
    <PageShell>
      <PageHeader
        title="Cálculo OODC — teste"
        badge={
          <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
            DEV
          </span>
        }
      ></PageHeader>

      <FormCalculoOodc />
    </PageShell>
  );
}
