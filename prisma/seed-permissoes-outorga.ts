/**
 * Provisiona os grupos de acesso do Portal de Outorga Onerosa: Técnico, CAP e
 * DEUSO (novos) mais Administrador (já existente — ganha automaticamente
 * todas as permissões cadastradas no banco, inclusive as novas).
 *
 * Idempotente: pode ser re-executado a qualquer momento — permissões são
 * upsert por `permissao`, grupos por `nome`, e o vínculo grupo↔permissão é
 * sempre re-declarado por completo (`set`) para refletir exatamente a tabela
 * abaixo, mesmo que alguém tenha mexido manualmente pela UI.
 *
 * Atribuir usuários aos grupos continua sendo feito pela tela /usuarios
 * (multi-select "Grupos de permissão" em form-usuario.tsx) — não é papel
 * deste script.
 */

import { prisma } from '../lib/prisma';

const PERMISSOES = [
	{
		permissao: 'processos_ver_todos',
		nome: 'Ver todos os processos',
	},
	{
		permissao: 'processos_editar_dados_iniciais',
		nome: 'Editar dados iniciais do processo',
	},
	{
		permissao: 'processos_recalcular',
		nome: 'Recalcular contrapartida do processo',
	},
	{
		permissao: 'parcelas_editar',
		nome: 'Inserir/editar parcelas',
	},
	{
		permissao: 'monitoramento_editar',
		nome: 'Editar Monitoramento DEUSO e Cota de Solidariedade',
	},
	{
		permissao: 'processos_ver_quitados',
		nome: 'Ver processos quitados',
	},
	{
		permissao: 'dashboard_ver',
		nome: 'Ver dashboard (página inicial)',
	},
	{
		permissao: 'processos_criar_geosampa',
		nome: 'Criar processo via busca GeoSampa/SQL (fluxo avançado)',
	},
	{
		permissao: 'parcelas_reverter_antecipacao',
		nome: 'Desfazer antecipação de parcela (restaurar status anterior)',
	},
	{
		permissao: 'planejamento_orcamentario_editar',
		nome: 'Gerar e editar planejamento orçamentário',
	},
] as const;

// Permissões já existentes no projeto (fora deste script) que os grupos abaixo reaproveitam.
const PERMISSAO_CRIAR_PROCESSO = 'processos_criar';

// "Administrador" já existe no banco como o grupo de administração do sistema
// (usuário.dev também dá bypass total, mas nem todo admin operacional é dev).
const GRUPO_ADMIN = 'Administrador';

const GRUPOS: Record<string, string[]> = {
	Técnico: [PERMISSAO_CRIAR_PROCESSO, 'processos_editar_dados_iniciais', 'processos_recalcular'],
	CAP: ['processos_ver_todos', 'parcelas_editar'],
	// DEUSO só vê processos quitados (não mais "ver todos").
	DEUSO: ['monitoramento_editar', 'processos_ver_quitados'],
	// Só visualiza — não altera nem adiciona nada.
	'FUNDURB/GAB': ['processos_ver_todos', 'dashboard_ver'],
	// Administrador ganha, além destas, todas as demais permissões já cadastradas no banco (abaixo).
	[GRUPO_ADMIN]: [],
};

async function main() {
	for (const p of PERMISSOES) {
		await prisma.permissao.upsert({
			where: { permissao: p.permissao },
			update: { nome: p.nome },
			create: p,
		});
		console.log(`Permissão ok: ${p.permissao}`);
	}

	const todasPermissoes = await prisma.permissao.findMany({ select: { id: true, permissao: true } });
	const idPorPermissao = new Map(todasPermissoes.map((p) => [p.permissao, p.id]));

	for (const [nomeGrupo, permissoesDoGrupo] of Object.entries(GRUPOS)) {
		const grupo = await prisma.grupoPermissao.upsert({
			where: { nome: nomeGrupo },
			update: {},
			create: { nome: nomeGrupo },
		});

		const idsFinais =
			nomeGrupo === GRUPO_ADMIN
				? todasPermissoes.map((p) => p.id)
				: permissoesDoGrupo
						.map((permissao) => idPorPermissao.get(permissao))
						.filter((id): id is string => Boolean(id));

		await prisma.grupoPermissao.update({
			where: { id: grupo.id },
			data: { permissoes: { set: idsFinais.map((id) => ({ id })) } },
		});

		console.log(`Grupo "${nomeGrupo}" com ${idsFinais.length} permissão(ões).`);
	}
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
