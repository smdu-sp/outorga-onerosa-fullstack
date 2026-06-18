/** @format */

export const formatDate = (date: Date): string => {
	return date.toLocaleDateString('pt-BR');
};

export const formatCurrency = (value: number): string => {
	return value.toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	});
};

export const days = Array.from({ length: 31 }, (_, i) => {
	const num = i + 1;
	return num < 10 ? `0${num}` : `${num}`;
});

export const parcelasP = Array.from({ length: 10 }, (_, i) => {
	const num = i + 1;
	return num;
});

export interface Installment {
	number: number;
	dueDate: Date;
	value: number;
}

export const calculoParcelas = (
	valorTotal: string,
	parcelas: string,
	diaVencimento: string,
) => {
	const total = Number.parseFloat(valorTotal);
	const count = Number.parseInt(parcelas);
	const day = Number.parseInt(diaVencimento);

	// Calculate installment value (rounded to 2 decimal places)
	const valorParcela = Math.floor((total / count) * 100) / 100;

	console.log({ valorParcela, total, count });
	// Calculate due dates
	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

	const newInstallments: Installment[] = [];

	for (let i = 0; i < count; i++) {
		// Calculate due date (same day of each month)
		let dueDate = new Date(currentYear, currentMonth + i, day);

		// Adjust for months with fewer days
		if (day > 28) {
			// Create date for the first of the next month, then go back one day
			const nextMonth = new Date(currentYear, currentMonth + i + 1, 1);
			nextMonth.setDate(nextMonth.getDate() - 1);

			// If the day is greater than the last day of the month, use the last day
			if (day > nextMonth.getDate()) {
				dueDate = nextMonth;
			}
		}

		newInstallments.push({
			number: i + 1,
			dueDate,
			value: valorParcela,
		});
	}

	// Adjust the last installment to account for rounding errors
	const sum = newInstallments.reduce((acc, curr) => acc + curr.value, 0);
	console.log({ sum });
	const difference = total - sum;

	if (Math.abs(difference) > 0.01) {
		newInstallments[newInstallments.length - 1].value += difference;
	}

	return newInstallments;
};

// Format currency input
