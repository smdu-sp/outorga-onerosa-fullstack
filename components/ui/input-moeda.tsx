/** @format */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

function formatarCentavos(centavos: number): string {
	const valor = centavos / 100;
	return valor.toLocaleString('pt-BR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export interface InputMoedaProps
	extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
	value: number;
	onValueChange: (value: number) => void;
}

/**
 * Input de dinheiro com máscara "." (milhar) / "," (decimal): os dígitos digitados
 * entram pela direita, como centavos — igual ao comportamento padrão de caixas
 * eletrônicos/apps bancários. `value`/`onValueChange` sempre trafegam em reais (number).
 */
function InputMoeda({ value, onValueChange, className, disabled, ...props }: InputMoedaProps) {
	const centavosAtuais = Math.round((Number.isFinite(value) ? value : 0) * 100);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const digitos = e.target.value.replace(/\D/g, '');
		const centavos = digitos === '' ? 0 : Number(digitos);
		onValueChange(centavos / 100);
	}

	return (
		<div className="relative">
			<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
				R$
			</span>
			<input
				type="text"
				inputMode="decimal"
				data-slot="input"
				value={formatarCentavos(centavosAtuais)}
				onChange={handleChange}
				disabled={disabled}
				className={cn(
					'border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent py-1 pl-9 pr-3 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
					'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
					'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
					className,
				)}
				{...props}
			/>
		</div>
	);
}

export { InputMoeda };
