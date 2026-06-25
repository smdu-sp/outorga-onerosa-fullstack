'use client'

import { Input } from "@/components/ui/input";
import { z } from "zod";
import type { Workbook, Worksheet } from "exceljs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTransition, useState } from "react";
import * as processosServices from "@/services/processos";
import { IProcesso } from "@/types/processo";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
    tipo: z.enum(["AD", "SEI"], { required_error: "Selecione um tipo de documento." }),
});

// Unwrap ExcelJS formula cells to their cached result value
function resolveCell(value: unknown): unknown {
    if (
        value !== null &&
        value !== undefined &&
        typeof value === 'object' &&
        !(value instanceof Date) &&
        !Array.isArray(value) &&
        'result' in (value as Record<string, unknown>)
    ) {
        return (value as { result: unknown }).result ?? null;
    }
    return value;
}

function worksheetToArrayRows(ws: Worksheet): unknown[][] {
    const rows: unknown[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
        rows.push((row.values as unknown[]).slice(1));
    });
    return rows;
}

export default function FormImportacao() {
    const [arquivo, setArquivo] = useState<File | null>(null);
    const [isPending, startTransition] = useTransition();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            tipo: "AD",
        },
    });

    async function onSubmit({ tipo }: z.infer<typeof formSchema>) {
        if (!arquivo) toast("Selecione um arquivo válido!");
        if (arquivo) await enviarArquivo(arquivo, tipo);
    }

    async function enviarArquivo(arquivo: File, tipo: string): Promise<void> {
        if (!arquivo) return alert("Suba um arquivo válido!");
        try {
            const { default: ExcelJS } = await import("exceljs");
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.load(await arquivo.arrayBuffer());
            switch (tipo) {
                case "AD":
                    await planilhaAD(wb);
                    break;
                case "SEI":
                    planilhaSEI(wb);
                    break;
            }
        } catch {
            toast("Arquivo inválido!");
        }
    }

    function verificaVencimentoParcela(processo: IProcesso) {
        if (processo.parcelas) {
            const parcelas2024 = processo.parcelas.filter(parcela => parcela.vencimento.getFullYear() >= 2024);
            return parcelas2024.length > 0;
        }
        return false;
    }

    async function planilhaAD(wb: Workbook) {
        const typeKeyValue: Record<string, string> = {
            "79": "PDE",
            "78": "COTA",
            "7022": "PDE",
            "7137": "COTA",
        }
        startTransition(async () => {
            const linhasEmPagamentoDPD = wb.worksheets[1] ? worksheetToArrayRows(wb.worksheets[1]) : [];
            const linhasQuitadoDPD = wb.worksheets[2] ? worksheetToArrayRows(wb.worksheets[2]) : [];
            const linhasQuebraDPD = wb.worksheets[3] ? worksheetToArrayRows(wb.worksheets[3]) : [];
            const linhasPagamentoAVistaDPCI = wb.worksheets[5] ? worksheetToArrayRows(wb.worksheets[5]) : [];
            const processos: IProcesso[] = [];
            let processo: IProcesso | undefined;
            console.log({linhasEmPagamentoDPD, linhasQuitadoDPD, linhasQuebraDPD, linhasPagamentoAVistaDPCI});
            let cpf_cnpj: string | undefined = "";
            for (const index in linhasEmPagamentoDPD) {
                if (+index > 0) {
                    //eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const linhaParcela: any = linhasEmPagamentoDPD[index];

                    const codigoRaw = resolveCell(linhaParcela[1]);
                    const tipo = codigoRaw ? typeKeyValue[String(codigoRaw)] : undefined;
                    const dataSerial = resolveCell(linhaParcela[0]);
                    const data_entrada = dataSerial ? new Date(Date.UTC(0, 0, Number(dataSerial))) : undefined;
                    const protocolo_ad = resolveCell(linhaParcela[2]) || undefined;
                    const num_processo = resolveCell(linhaParcela[3]) || undefined;

                    const num_parcela = +resolveCell(linhaParcela[5])!;
                    const situacaoRaw = resolveCell(linhaParcela[9]);
                    const status_quitacao = situacaoRaw === "Pago";
                    const valorRaw = resolveCell(linhaParcela[7]);
                    const valor = typeof valorRaw === "string" ? +valorRaw.replace(".", "").replace(",", ".").replace("R$", "").trim() : Number(valorRaw);
                    const vencimentoSerial = resolveCell(linhaParcela[6]);
                    const vencimento = new Date(Date.UTC(0, 0, Number(vencimentoSerial)));
                    const anoPagamentoRaw = resolveCell(linhaParcela[8]);
                    const ano_pagamento = (anoPagamentoRaw && anoPagamentoRaw !== "") ? +anoPagamentoRaw : undefined;
                    const cpfRaw = resolveCell(linhaParcela[4]);
                    if (cpfRaw && String(cpfRaw).trim() !== "" && num_parcela === 1) cpf_cnpj = String(cpfRaw).trim() || undefined as unknown as string;
                    if (num_parcela === 1 && data_entrada) {
                        if (processo && verificaVencimentoParcela(processo)) {
                            processos.push(processo);
                        }
                        processo = { tipo, data_entrada, protocolo_ad: protocolo_ad as string | undefined, num_processo: num_processo as string, parcelas: [] }
                    }
                    if (processo && num_parcela && valor) processo.parcelas?.push({ num_parcela, status_quitacao, valor: valor || 0, vencimento, ano_pagamento, cpf_cnpj });
                }
            }
            if (processo && verificaVencimentoParcela(processo)) {
                processos.push(processo);
            }
            processo = undefined;
            if (processos.length > 0) {
                const response = await processosServices.importar(processos);
                console.log(response);
            }
        })
    }

    function planilhaSEI(wb: Workbook) {
        const ws = wb.worksheets[0];
        const linhas = ws ? worksheetToArrayRows(ws) : [];
        if (linhas.length <= 0) toast("Lista vazia.");
    }

    return <>
        <Form {...form}>
			<form
				className='p-6 md:p-8 dark:bg-muted bg-background rounded-lg'
				onSubmit={form.handleSubmit(onSubmit)}>
				<div className='flex flex-col gap-6'>
					<div className='grid gap-2'>
						<FormField
							control={form.control}
							name='tipo'
							render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger
											    className='dark:bg-background bg-muted'
                                            >
                                                <SelectValue placeholder="Tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="AD">Aprova Digital</SelectItem>
                                            <SelectItem value="SEI">SEI/Físico</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
							)}
						/>
					</div>
					<div className='grid gap-2'>
                        <FormItem>
                            <FormLabel>Arquivo</FormLabel>
                            <FormControl>
                                <Input
                                    type="file"
                                    multiple={false}
                                    accept=".xlsx, .xlsm"
                                    className='dark:bg-background bg-muted'
                                    onChange={(event) => {
                                        if (event.target.files) {
                                            setArquivo(event.target.files[0]);
                                        }
                                    }}
                                />
                            </FormControl>
                            <FormDescription />
                            <FormMessage />
                        </FormItem>
					</div>
					<Button
						type='submit'
                        disabled={isPending}
                    >
						{isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : "Enviar"}
					</Button>
				</div>
			</form>
		</Form>
    </>
}
