import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { deserializarRegistro, CAMPOS_DECIMAL, CAMPOS_DECIMAL_CALCULO } from './serializar';

const ARQUIVO = path.join(__dirname, 'dados-exportados.json');
const LOTE = 500;

type Vinculo = { a: string; b: string };

type DadosExportados = {
	versao: number;
	exportadoEm: string;
	usuarios: Record<string, unknown>[];
	permissoes: Record<string, unknown>[];
	gruposPermissao: Record<string, unknown>[];
	vinculos: {
		permissoesUsuarios: Vinculo[];
		permissoesGrupos: Vinculo[];
		usuariosGrupos: Vinculo[];
	};
	processos: Record<string, unknown>[];
	parcelas: Record<string, unknown>[];
	monitoramento: {
		fichas: Record<string, unknown>[];
		coordenadas: Record<string, unknown>[];
		localizacaoLote: Record<string, unknown>[];
		enderecos: Record<string, unknown>[];
		enquadramentoUrbanistico: Record<string, unknown>[];
		subcategoriasUso: Record<string, unknown>[];
		calculoOutorga: Record<string, unknown>[];
		situacao: Record<string, unknown>[];
		licencas: Record<string, unknown>[];
		anotacoesDeuso: Record<string, unknown>[];
		cotaSolidariedade: Record<string, unknown>[];
	};
};

export function arquivoExportadoExiste(): boolean {
	return fs.existsSync(ARQUIVO);
}

function carregarDados(): DadosExportados {
	if (!arquivoExportadoExiste()) {
		throw new Error(
			`Arquivo não encontrado: ${ARQUIVO}\n` +
				'Na máquina com o banco dev, execute: npm run db:export-seed\n' +
				'Depois copie prisma/seed/dados-exportados.json para o projeto do colega.',
		);
	}
	return JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8')) as DadosExportados;
}

async function inserirLote<T extends Record<string, unknown>>(
	prisma: PrismaClient,
	modelo: { createMany: (args: { data: T[]; skipDuplicates?: boolean }) => Promise<{ count: number }> },
	registros: Record<string, unknown>[],
	nome: string,
	camposDecimal: Set<string> = CAMPOS_DECIMAL,
) {
	if (!registros.length) return;
	const dados = registros.map((r) => deserializarRegistro(r, camposDecimal) as T);
	for (let i = 0; i < dados.length; i += LOTE) {
		const lote = dados.slice(i, i + LOTE);
		await modelo.createMany({ data: lote, skipDuplicates: true });
	}
	console.log(`  ${nome}: ${registros.length}`);
}

async function limparBanco(prisma: PrismaClient) {
	console.log('Limpando banco antes da importação...');
	await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
	const tabelas = [
		'monitoramento_anotacoes_deuso',
		'monitoramento_licencas',
		'monitoramento_situacao',
		'monitoramento_calculo_outorga',
		'monitoramento_subcategorias_uso',
		'monitoramento_enquadramento_urbanistico',
		'monitoramento_enderecos',
		'monitoramento_localizacao_lote',
		'monitoramento_coordenadas',
		'monitoramento_fichas',
		'monitoramento_cota_solidariedade',
		'parcelas',
		'processos',
		'_GrupoPermissaoToUsuario',
		'_GrupoPermissaoToPermissao',
		'_PermissaoToUsuario',
		'grupos_permissoes',
		'permissoes',
		'usuarios',
	];
	for (const tabela of tabelas) {
		await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${tabela}\``);
	}
	await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
}

async function inserirVinculos(prisma: PrismaClient, tabela: string, vinculos: Vinculo[]) {
	if (!vinculos.length) return;
	for (let i = 0; i < vinculos.length; i += LOTE) {
		const lote = vinculos.slice(i, i + LOTE);
		const valores = lote.map((v) => `('${v.a}', '${v.b}')`).join(',');
		await prisma.$executeRawUnsafe(`INSERT IGNORE INTO \`${tabela}\` (A, B) VALUES ${valores}`);
	}
}

export async function importarDadosExportados(prisma: PrismaClient) {
	const dados = carregarDados();
	console.log(`\nImportando snapshot exportado em ${dados.exportadoEm}...\n`);

	await limparBanco(prisma);

	await inserirLote(prisma, prisma.usuario, dados.usuarios, 'Usuários');
	await inserirLote(prisma, prisma.permissao, dados.permissoes, 'Permissões');
	await inserirLote(prisma, prisma.grupoPermissao, dados.gruposPermissao, 'Grupos de permissão');

	await inserirVinculos(prisma, '_PermissaoToUsuario', dados.vinculos.permissoesUsuarios);
	await inserirVinculos(prisma, '_GrupoPermissaoToPermissao', dados.vinculos.permissoesGrupos);
	await inserirVinculos(prisma, '_GrupoPermissaoToUsuario', dados.vinculos.usuariosGrupos);
	console.log('  Vínculos N:N restaurados');

	await inserirLote(prisma, prisma.processo, dados.processos, 'Processos');
	await inserirLote(prisma, prisma.parcela, dados.parcelas, 'Parcelas');

	const m = dados.monitoramento;
	await inserirLote(prisma, prisma.monitoramentoFicha, m.fichas, 'Monitoramento — fichas');
	await inserirLote(prisma, prisma.monitoramentoCoordenada, m.coordenadas, 'Monitoramento — coordenadas');
	await inserirLote(
		prisma,
		prisma.monitoramentoLocalizacaoLote,
		m.localizacaoLote,
		'Monitoramento — localização',
	);
	await inserirLote(prisma, prisma.monitoramentoEndereco, m.enderecos, 'Monitoramento — endereços');
	await inserirLote(
		prisma,
		prisma.monitoramentoEnquadramentoUrbanistico,
		m.enquadramentoUrbanistico,
		'Monitoramento — enquadramento',
	);
	await inserirLote(
		prisma,
		prisma.monitoramentoSubcategoriaUso,
		m.subcategoriasUso,
		'Monitoramento — subcategorias',
	);
	await inserirLote(
		prisma,
		prisma.monitoramentoCalculoOutorga,
		m.calculoOutorga,
		'Monitoramento — cálculo',
		CAMPOS_DECIMAL_CALCULO,
	);
	await inserirLote(prisma, prisma.monitoramentoSituacao, m.situacao, 'Monitoramento — situação');
	await inserirLote(prisma, prisma.monitoramentoLicenca, m.licencas, 'Monitoramento — licenças');
	await inserirLote(
		prisma,
		prisma.monitoramentoAnotacaoDeuso,
		m.anotacoesDeuso,
		'Monitoramento — anotações',
	);
	await inserirLote(
		prisma,
		prisma.monitoramentoCotaSolidariedade,
		m.cotaSolidariedade,
		'Monitoramento — cota solidariedade',
	);
}
