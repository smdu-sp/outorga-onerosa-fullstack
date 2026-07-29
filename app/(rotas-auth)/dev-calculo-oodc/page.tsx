import { requireDev } from '@/lib/auth/session';
import { FormCalculoOodc } from './_components/form-calculo-oodc';

export default async function DevCalculoOodcPage() {
	await requireDev();

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8">
			<div className="mb-6 flex items-center gap-3">
				<div className="flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-500/40 bg-yellow-500/10">
					<span className="text-sm">🧮</span>
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-bold">Cálculo OODC — teste</h1>
						<span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
							DEV
						</span>
					</div>
					<p className="mt-0.5 text-sm text-muted-foreground">
						Porta do memorial de cálculo da planilha oficial{' '}
						<code className="rounded bg-muted px-1 py-0.5 text-xs">
							oodc-prot-v1 1 0-desbloqueada.xlsm
						</code>{' '}
						— use para conferir se o sistema reproduz o mesmo valor de um cenário calculado na planilha.
					</p>
				</div>
			</div>

			<FormCalculoOodc />
		</div>
	);
}
