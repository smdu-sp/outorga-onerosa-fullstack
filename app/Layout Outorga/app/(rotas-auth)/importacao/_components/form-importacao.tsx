'use client'

import { Input } from "@/components/ui/input";
import { z } from "zod";
import * as xlsx from "xlsx";
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
        if (arquivo) enviarArquivo(arquivo, tipo);
    }

    function enviarArquivo(arquivo: File, tipo: string): void {
        if (!arquivo) return alert("Suba um arquivo válido!");
            const reader = new FileReader();
            reader.readAsArrayBuffer(arquivo);
            reader.onload = (e) => {
                if (e.target){
                    const data = e.target?.result;
                    const wb = xlsx.read(data);
                    try {
                        switch (tipo) {
                            case "AD":
                                planilhaAD(wb)
                                break;
                            case "SEI":
                                planilhaSEI(wb)
                                break;
                        }
                    } catch (error) {
                        toast("Arquivo inválido!");
                    }
                }
        };
    }

    function verificaVencimentoParcela(processo: IProcesso) {
        if (processo.parcelas) {
            const parcelas2024 = processo.parcelas.filter(parcela => parcela.vencimento.getFullYear() >= 2024);
            return parcelas2024.length > 0;
        }
        return false;
    }

    async function planilhaAD(wb: xlsx.WorkBook) {
        const typeKeyValue: any = {
            "79": "PDE",
            "78": "COTA",
            "7022": "PDE",
            "7137": "COTA",
        }
        startTransition(async () => {
            const emPagamentoDPD = wb.Sheets[wb.SheetNames[1]];
            const quitadoDPD = wb.Sheets[wb.SheetNames[2]];
            const quebraDPD = wb.Sheets[wb.SheetNames[3]];
            const pagamentoAVistaDPCI = wb.Sheets[wb.SheetNames[5]];
            const linhasEmPagamentoDPD = xlsx.utils.sheet_to_json(emPagamentoDPD, { header: 1 });
            const linhasQuitadoDPD = xlsx.utils.sheet_to_json(quitadoDPD, { header: 1 });
            const linhasQuebraDPD = xlsx.utils.sheet_to_json(quebraDPD, { header: 1 });
            const linhasPagamentoAVistaDPCI = xlsx.utils.sheet_to_json(pagamentoAVistaDPCI, { header: 1 });
            const processos: IProcesso[] = [];
            let processo: IProcesso | undefined;
            console.log({linhasEmPagamentoDPD, linhasQuitadoDPD, linhasQuebraDPD, linhasPagamentoAVistaDPCI});
            let cpf_cnpj = "";
            for (const index in linhasEmPagamentoDPD) {
                if (+index > 0) {
                    //eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const linhaParcela: any = linhasEmPagamentoDPD[index];

                    const tipo = linhaParcela[1] ? typeKeyValue[linhaParcela[1]] : undefined;
                    const data_entrada = linhaParcela[0] ? new Date(Date.UTC(0, 0, linhaParcela[0])) : undefined;
                    const protocolo_ad = linhaParcela[2] || undefined;
                    const num_processo = linhaParcela[3] || undefined;

                    const num_parcela = +linhaParcela[5];
                    const status_quitacao = linhaParcela[9] === "Pago";
                    const valor = typeof linhaParcela[7] === "string" ? +linhaParcela[7].replace(".", "").replace(",", ".").replace("R$", "").trim() : linhaParcela[7];
                    const vencimento = new Date(Date.UTC(0, 0, linhaParcela[6]));
                    const ano_pagamento = (linhaParcela[8] && linhaParcela[8] !== "") ? +linhaParcela[8] : undefined;
                    if (linhaParcela[4] && linhaParcela[4].trim() !== "" && num_parcela === 1) cpf_cnpj = linhaParcela[4].trim() || undefined;
                    if (num_parcela === 1 && data_entrada) {
                        if (processo && verificaVencimentoParcela(processo)) {
                            processos.push(processo);
                        }
                        processo = { tipo, data_entrada, protocolo_ad, num_processo, parcelas: [] }
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
                // const teste = processos.filter((processo) => !processo.parcelas || processo.parcelas.length === 0 || processo.parcelas.length > 10);
                // console.log({ teste, processos });
            }
        })
    }

    function planilhaSEI(wb: xlsx.WorkBook) {
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const linhas = xlsx.utils.sheet_to_json(ws, { header: 1 });
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
                                    accept=".csv, .xls, .xlsx, .xlsm"
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