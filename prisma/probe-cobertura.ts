import { prisma } from '../lib/prisma';

async function main() {
	const [
		processos,
		comTipo,
		porTipo,
		parcelas,
		parcelasQuitadas,
		parcelasComDataQuit,
		parcelasComAnoPag,
		fichas,
		enq,
		enqComDistrito,
		enqComSub,
		enqComZona,
		enqComMacroarea,
		calc,
		situacao,
		coord,
		licencas,
		cotas,
		procComDataEntrada,
	] = await Promise.all([
		prisma.processo.count(),
		prisma.processo.count({ where: { tipo: { not: null } } }),
		prisma.processo.groupBy({ by: ['tipo'], _count: true }),
		prisma.parcela.count(),
		prisma.parcela.count({ where: { status_quitacao: true } }),
		prisma.parcela.count({ where: { data_quitacao: { not: null } } }),
		prisma.parcela.count({ where: { ano_pagamento: { not: null } } }),
		prisma.monitoramentoFicha.count(),
		prisma.monitoramentoEnquadramentoUrbanistico.count(),
		prisma.monitoramentoEnquadramentoUrbanistico.count({ where: { distrito: { not: null } } }),
		prisma.monitoramentoEnquadramentoUrbanistico.count({ where: { subprefeitura: { not: null } } }),
		prisma.monitoramentoEnquadramentoUrbanistico.count({ where: { zona_uso_1_18081: { not: null } } }),
		prisma.monitoramentoEnquadramentoUrbanistico.count({ where: { macroarea: { not: null } } }),
		prisma.monitoramentoCalculoOutorga.count(),
		prisma.monitoramentoSituacao.count({ where: { origem: { not: null } } }),
		prisma.monitoramentoCoordenada.count({ where: { coordenada_e: { not: null } } }),
		prisma.monitoramentoLicenca.count(),
		prisma.monitoramentoCotaSolidariedade.count(),
		prisma.processo.count({ where: { data_entrada: { not: null } } }),
	]);

	// Densidade de campos numéricos-chave do cálculo de outorga
	const calcRows = await prisma.monitoramentoCalculoOutorga.findMany({
		select: {
			area_computavel_total: true,
			area_construida_total: true,
			coeficiente_utilizado: true,
			coeficiente_basico: true,
			area_terreno: true,
			contrapartida_total: true,
			area_habitacao_social: true,
		},
	});
	const dens = (pred: (r: (typeof calcRows)[number]) => boolean) =>
		calcRows.length ? Math.round((calcRows.filter(pred).length / calcRows.length) * 100) : 0;

	const cotaRows = await prisma.monitoramentoCotaSolidariedade.findMany({
		select: { valor_calculado_processo: true, area_terreno: true, modalidade: true, unidades: true },
	});
	const densCota = (pred: (r: (typeof cotaRows)[number]) => boolean) =>
		cotaRows.length ? Math.round((cotaRows.filter(pred).length / cotaRows.length) * 100) : 0;

	const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

	console.log('===== COBERTURA DE DADOS =====');
	console.log(`Processos: ${processos} | com tipo: ${comTipo} (${pct(comTipo, processos)}%)`);
	console.log('Por tipo:', porTipo.map((t) => `${t.tipo ?? 'null'}=${t._count}`).join(', '));
	console.log(`  com data_entrada: ${procComDataEntrada} (${pct(procComDataEntrada, processos)}%)`);
	console.log('');
	console.log(`Parcelas: ${parcelas} | quitadas: ${parcelasQuitadas} (${pct(parcelasQuitadas, parcelas)}%)`);
	console.log(`  com data_quitacao: ${parcelasComDataQuit} (${pct(parcelasComDataQuit, parcelas)}%)`);
	console.log(`  com ano_pagamento: ${parcelasComAnoPag} (${pct(parcelasComAnoPag, parcelas)}%)`);
	console.log('');
	console.log(`Fichas monitoramento (PDE): ${fichas} | Cotas: ${cotas}`);
	console.log(`Enquadramento urbanístico: ${enq}`);
	console.log(`  distrito: ${enqComDistrito} (${pct(enqComDistrito, enq)}%) | subpref: ${enqComSub} (${pct(enqComSub, enq)}%)`);
	console.log(`  zona_uso_1: ${enqComZona} (${pct(enqComZona, enq)}%) | macroárea: ${enqComMacroarea} (${pct(enqComMacroarea, enq)}%)`);
	console.log(`Situação c/ origem(sistema): ${situacao} | Coordenadas: ${coord} | Licenças: ${licencas}`);
	console.log('');
	console.log(`Cálculo Outorga (registros): ${calcRows.length}`);
	console.log(`  área computável total: ${dens((r) => r.area_computavel_total != null)}%`);
	console.log(`  área construída total: ${dens((r) => r.area_construida_total != null)}%`);
	console.log(`  coef. utilizado: ${dens((r) => r.coeficiente_utilizado != null)}%`);
	console.log(`  coef. básico: ${dens((r) => r.coeficiente_basico != null)}%`);
	console.log(`  área terreno: ${dens((r) => r.area_terreno != null)}%`);
	console.log(`  contrapartida total (texto): ${dens((r) => !!r.contrapartida_total)}%`);
	console.log(`  área HIS: ${dens((r) => r.area_habitacao_social != null)}%`);
	console.log('');
	console.log(`Cota (registros): ${cotaRows.length}`);
	console.log(`  valor_calculado_processo: ${densCota((r) => r.valor_calculado_processo != null)}%`);
	console.log(`  área terreno: ${densCota((r) => r.area_terreno != null)}%`);
	console.log(`  modalidade: ${densCota((r) => !!r.modalidade)}%`);
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error('ERRO:', e.message);
		process.exit(1);
	});
