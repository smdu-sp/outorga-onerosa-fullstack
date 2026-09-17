import { PageHeader, PageShell, SectionCard } from "@/components/page-shell";
import { Upload } from "lucide-react";
import FormImportacao from "./_components/form-importacao";

export default function Importacao() {
    return (
        <PageShell max="narrow">
            <PageHeader icon={Upload} title="Importação" />
            <SectionCard>
                <FormImportacao />
            </SectionCard>
        </PageShell>
    );
}
