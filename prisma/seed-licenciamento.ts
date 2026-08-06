import { PrismaClient, type CoordenadoriaAnalise } from '@prisma/client';

const prisma = new PrismaClient();

const TIPOS_EVENTO_TECNICO = [
	'Aguarda aceite',
	'Aguarda pagamento inicial',
	'Aguarda pagamento complementar',
	'Aguarda pagamento - Outorga Onerosa',
	'Aguarda pagamento - CEPAC',
	'Aguarda pagamento - Cota de Solidariedade',
	'Aguarda - distribuição para Diretoria',
	'Aguarda - distribuição para Técnico',
	'Análise',
	'Comunique-se',
	'Comunique-se complementar',
	'Comunique-se - Outorga Onerosa',
	'Comunique-se - CEPAC',
	'Comunique-se - Cota de Solidariedade',
	'Comunique-se - Fruição Pública',
	'Comunique-se - Doação de Calçada',
	'Consulta - CASE/ BDT',
	'Consulta - ATAJ',
	'Consulta - ATECC',
	'Consulta - DEUSO',
	'Consulta - CEUSO',
	'Consulta - CTLU',
	'Consulta - CAIEPS',
	'Consulta - CAEHIS',
	'Consulta - SP Urbanismo',
	'Consulta - PGM',
	'Consulta - SIURB/ PROJ 004',
	'Consulta - SIURB/ PROJ 3',
	'Consulta - SIURB/ PROJ 4',
	'Consulta - SVMA',
	'Consulta - SMC/ CONPRESP',
	'Consulta - SMPED/ CPA',
	'Consulta - SMT/ CET',
	'Consulta - SMSUB',
	'Consulta - DESAP',
	'Consulta - SF',
	'Consulta - IPHAN',
	'Consulta - CONDEPHAAT',
	'Consulta - SMA/ CETESB',
	'Consulta - DER/ DENIT',
	'Consulta - COMAER',
	'Encaminhado para CAEPP',
	'Encaminhado para CAP',
	'Aguarda documento interessado',
	'Proposta de Deferimento',
	'Proposta de Indeferimento',
	'Aguardando publicação',
	'Indeferido',
	'Indeferido e Encerrado',
	'Deferido',
	'Deferido Encerrado',
	'Para fiscalização da Subprefeitura',
	'Para subprefeitura competente',
	'Aguardando Recurso 1ª instância',
	'Aguardando Recurso 2ª instância',
	'Aguardando Recurso 3ª instância',
	'Aguarda Retorno para Encerramento',
	'Arquivado',
	'Atendimento ao Público',
	'Relatório Técnico',
];

const TIPOS_EVENTO_ADMIN = [
	'Agendamento',
	'Atendimento ao Público',
	'Recebimento de Processos',
	'Tramitação de Processos',
	'Juntada de Documentação',
	'Conferência de Conteúdo',
	'Encaminhamentos',
	'Arquivamento',
	'Controle de Processos',
	'Controle de Bens Patrimoniais',
	'Gestão de Materiais',
	'Consultas ao DOC',
	'Comunicações',
];

const SITUACOES = [
	{ codigo: 'ANALISE', nome: 'Análise', encerra: false },
	{ codigo: 'ANALISE_INICIAL', nome: 'Análise Inicial', encerra: false },
	{ codigo: 'COMUNIQUE_SE', nome: 'Comunique-se', encerra: false },
	{ codigo: 'AGUARDA_DOCUMENTO', nome: 'Aguarda documento interessado', encerra: false },
	{ codigo: 'DEFERIDO', nome: 'Deferido', encerra: false },
	{ codigo: 'INDEFERIDO', nome: 'Indeferido', encerra: false },
	{ codigo: 'DEFERIDO_ENCERRADO', nome: 'Deferido Encerrado', encerra: true },
	{ codigo: 'INDEFERIDO_ENCERRADO', nome: 'Indeferido e Encerrado', encerra: true },
	{ codigo: 'ARQUIVADO', nome: 'Arquivado', encerra: true },
];

const CATEGORIAS_SERVIN: { codigo: string; nome: string }[] = [
	{ codigo: 'HOSPITAL', nome: 'Hospital' },
	{ codigo: 'UBS', nome: 'UBS' },
	{ codigo: 'UPA', nome: 'UPA' },
	{ codigo: 'CEU', nome: 'CEU' },
	{ codigo: 'SESC', nome: 'SESC' },
	{ codigo: 'TJ-SP', nome: 'TJ-SP' },
];

const DIVISOES_SERVIN = ['DSIGP', 'DSIMP', 'SERVIN-G'];

function slugCodigo(nome: string) {
	return nome
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_|_$/g, '')
		.slice(0, 80);
}

async function upsertTipoEvento(
	categoria: 'TECNICO' | 'ADMINISTRATIVO',
	nome: string,
	coordenadoria: CoordenadoriaAnalise | null = null,
) {
	const codigo = slugCodigo(nome);
	const existing = await prisma.tipoEventoLicenciamento.findFirst({
		where: { categoria, codigo, coordenadoria },
	});
	if (existing) return existing;
	return prisma.tipoEventoLicenciamento.create({
		data: { categoria, codigo, nome, coordenadoria },
	});
}

async function main() {
	console.log('Seed Gestão de Processos de Licenciamento…');

	for (const nome of TIPOS_EVENTO_TECNICO) {
		await upsertTipoEvento('TECNICO', nome, null);
	}
	for (const nome of TIPOS_EVENTO_ADMIN) {
		await upsertTipoEvento('ADMINISTRATIVO', nome, null);
	}

	for (const s of SITUACOES) {
		const existing = await prisma.situacaoLicenciamento.findFirst({
			where: { codigo: s.codigo, coordenadoria: null },
		});
		if (!existing) {
			await prisma.situacaoLicenciamento.create({
				data: {
					codigo: s.codigo,
					nome: s.nome,
					encerra: s.encerra,
					coordenadoria: null,
				},
			});
		}
	}

	for (const codigo of DIVISOES_SERVIN) {
		await prisma.divisaoLicenciamento.upsert({
			where: {
				coordenadoria_codigo: { coordenadoria: 'SERVIN', codigo },
			},
			create: { coordenadoria: 'SERVIN', codigo, nome: codigo },
			update: {},
		});
	}

	for (const cat of CATEGORIAS_SERVIN) {
		await prisma.categoriaLicenciamento.upsert({
			where: {
				coordenadoria_codigo: { coordenadoria: 'SERVIN', codigo: cat.codigo },
			},
			create: { coordenadoria: 'SERVIN', codigo: cat.codigo, nome: cat.nome },
			update: { nome: cat.nome },
		});
	}

	console.log('Seed concluído.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
