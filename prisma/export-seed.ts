/**
 * Exporta o conteúdo do banco de dados atual para prisma/seed/dados-exportados.json
 * Execute na máquina com o banco dev populado: npm run db:export-seed
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { serializarRegistro } from './seed/serializar';

const prisma = new PrismaClient();
const ARQUIVO_SAIDA = path.join(__dirname, 'seed', 'dados-exportados.json');

type Vinculo = { a: string; b: string };

async function vinculos(tabela: string): Promise<Vinculo[]> {
	const rows = await prisma.$queryRawUnsafe<{ A: string; B: string }[]>(
		`SELECT A, B FROM \`${tabela}\``,
	);
	return rows.map((r) => ({ a: r.A, b: r.B }));
}

async function main() {
	console.log('Exportando dados do banco...\n');

	const [
		usuarios,
		permissoes,
		gruposPermissao,
		processos,
		parcelas,
		monitoramentoFichas,
		monitoramentoCoordenadas,
		monitoramentoLocalizacaoLote,
		monitoramentoEnderecos,
		monitoramentoEnquadramentoUrbanistico,
		monitoramentoSubcategoriasUso,
		monitoramentoCalculoOutorga,
		monitoramentoSituacao,
		monitoramentoLicencas,
		monitoramentoAnotacoesDeuso,
		monitoramentoCotaSolidariedade,
		permissoesUsuarios,
		permissoesGrupos,
		usuariosGrupos,
	] = await Promise.all([
		prisma.usuario.findMany(),
		prisma.permissao.findMany(),
		prisma.grupoPermissao.findMany(),
		prisma.processo.findMany(),
		prisma.parcela.findMany(),
		prisma.monitoramentoFicha.findMany(),
		prisma.monitoramentoCoordenada.findMany(),
		prisma.monitoramentoLocalizacaoLote.findMany(),
		prisma.monitoramentoEndereco.findMany(),
		prisma.monitoramentoEnquadramentoUrbanistico.findMany(),
		prisma.monitoramentoSubcategoriaUso.findMany(),
		prisma.monitoramentoCalculoOutorga.findMany(),
		prisma.monitoramentoSituacao.findMany(),
		prisma.monitoramentoLicenca.findMany(),
		prisma.monitoramentoAnotacaoDeuso.findMany(),
		prisma.monitoramentoCotaSolidariedade.findMany(),
		vinculos('_PermissaoToUsuario'),
		vinculos('_GrupoPermissaoToPermissao'),
		vinculos('_GrupoPermissaoToUsuario'),
	]);

	const payload = {
		versao: 1,
		exportadoEm: new Date().toISOString(),
		usuarios: usuarios.map(serializarRegistro),
		permissoes: permissoes.map(serializarRegistro),
		gruposPermissao: gruposPermissao.map(serializarRegistro),
		vinculos: {
			permissoesUsuarios,
			permissoesGrupos,
			usuariosGrupos,
		},
		processos: processos.map(serializarRegistro),
		parcelas: parcelas.map(serializarRegistro),
		monitoramento: {
			fichas: monitoramentoFichas.map(serializarRegistro),
			coordenadas: monitoramentoCoordenadas.map(serializarRegistro),
			localizacaoLote: monitoramentoLocalizacaoLote.map(serializarRegistro),
			enderecos: monitoramentoEnderecos.map(serializarRegistro),
			enquadramentoUrbanistico: monitoramentoEnquadramentoUrbanistico.map(serializarRegistro),
			subcategoriasUso: monitoramentoSubcategoriasUso.map(serializarRegistro),
			calculoOutorga: monitoramentoCalculoOutorga.map(serializarRegistro),
			situacao: monitoramentoSituacao.map(serializarRegistro),
			licencas: monitoramentoLicencas.map(serializarRegistro),
			anotacoesDeuso: monitoramentoAnotacoesDeuso.map(serializarRegistro),
			cotaSolidariedade: monitoramentoCotaSolidariedade.map(serializarRegistro),
		},
	};

	fs.mkdirSync(path.dirname(ARQUIVO_SAIDA), { recursive: true });
	fs.writeFileSync(ARQUIVO_SAIDA, JSON.stringify(payload));

	const tamanhoMb = (fs.statSync(ARQUIVO_SAIDA).size / 1024 / 1024).toFixed(2);

	console.log('Exportação concluída:', ARQUIVO_SAIDA);
	console.log(`Tamanho: ${tamanhoMb} MB\n`);
	console.log('Resumo:');
	console.log({
		usuarios: usuarios.length,
		permissoes: permissoes.length,
		gruposPermissao: gruposPermissao.length,
		processos: processos.length,
		parcelas: parcelas.length,
		monitoramentoFichas: monitoramentoFichas.length,
		monitoramentoCota: monitoramentoCotaSolidariedade.length,
	});
	console.log('\nCompartilhe o arquivo dados-exportados.json com seu colega.');
	console.log('No ambiente dele: npm run db:migrate && npm run db:seed');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
