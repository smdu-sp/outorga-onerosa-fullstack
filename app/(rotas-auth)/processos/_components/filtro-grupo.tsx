'use client';

import { FiltroSegmented } from '@/components/filtro-ui';

export function FiltroGrupo({
	opcoes,
	valor,
	onChange,
}: {
	opcoes: { value: string; label: string }[];
	valor: string;
	onChange: (value: string) => void;
}) {
	return <FiltroSegmented opcoes={opcoes} valor={valor} onChange={onChange} />;
}
