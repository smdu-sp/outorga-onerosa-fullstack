-- Gestão de Processos de Licenciamento

CREATE TABLE `lic_arquivamentos` (
  `id` varchar(191) NOT NULL,
  `processo_id` varchar(191) NOT NULL,
  `situacao` varchar(191) DEFAULT NULL,
  `local` varchar(191) DEFAULT NULL,
  `container` varchar(191) DEFAULT NULL,
  `caixa` varchar(191) DEFAULT NULL,
  `posicao` varchar(191) DEFAULT NULL,
  `quantidade_volumes` int(11) DEFAULT NULL,
  `quantidade_caixas` int(11) DEFAULT NULL,
  `data_arquivamento` date DEFAULT NULL,
  `observacao` text DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lic_arquivamentos_processo_id_key` (`processo_id`),
  KEY `lic_arquivamentos_container_idx` (`container`),
  CONSTRAINT `lic_arquivamentos_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_assuntos` (
  `id` varchar(191) NOT NULL,
  `coordenadoria` enum('RESID','SERVIN','COMIN','CAEPP','PARHIS') DEFAULT NULL,
  `nome` varchar(191) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `lic_assuntos_coordenadoria_idx` (`coordenadoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_auditorias` (
  `id` varchar(191) NOT NULL,
  `processo_id` varchar(191) NOT NULL,
  `usuario_id` varchar(191) DEFAULT NULL,
  `tipo_alteracao` varchar(191) NOT NULL,
  `valor_anterior` text DEFAULT NULL,
  `valor_novo` text DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `lic_auditorias_processo_id_idx` (`processo_id`),
  KEY `lic_auditorias_criado_em_idx` (`criado_em`),
  KEY `lic_auditorias_usuario_id_fkey` (`usuario_id`),
  CONSTRAINT `lic_auditorias_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lic_auditorias_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_categorias` (
  `id` varchar(191) NOT NULL,
  `coordenadoria` enum('RESID','SERVIN','COMIN','CAEPP','PARHIS') NOT NULL,
  `codigo` varchar(191) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lic_categorias_coordenadoria_codigo_key` (`coordenadoria`,`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_distribuicoes` (
  `id` varchar(191) NOT NULL,
  `processo_id` varchar(191) NOT NULL,
  `tipo` enum('DIRETORIA','TECNICO') NOT NULL,
  `destino` varchar(191) DEFAULT NULL,
  `tecnico_id` varchar(191) DEFAULT NULL,
  `data_inicio` date DEFAULT NULL,
  `data_fim` date DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `lic_distribuicoes_processo_id_idx` (`processo_id`),
  KEY `lic_distribuicoes_tecnico_id_idx` (`tecnico_id`),
  CONSTRAINT `lic_distribuicoes_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lic_distribuicoes_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_divisoes` (
  `id` varchar(191) NOT NULL,
  `coordenadoria` enum('RESID','SERVIN','COMIN','CAEPP','PARHIS') NOT NULL,
  `codigo` varchar(191) NOT NULL,
  `nome` varchar(191) DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lic_divisoes_coordenadoria_codigo_key` (`coordenadoria`,`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_eventos` (
  `id` varchar(191) NOT NULL,
  `processo_id` varchar(191) NOT NULL,
  `categoria` enum('TECNICO','ADMINISTRATIVO','AUTOMATICO') NOT NULL,
  `tipo_evento_id` varchar(191) DEFAULT NULL,
  `tecnico_id` varchar(191) DEFAULT NULL,
  `data_inicio` date DEFAULT NULL,
  `data_termino` date DEFAULT NULL,
  `descricao` text DEFAULT NULL,
  `observacao` text DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `lic_eventos_processo_id_idx` (`processo_id`),
  KEY `lic_eventos_tecnico_id_idx` (`tecnico_id`),
  KEY `lic_eventos_tipo_evento_id_idx` (`tipo_evento_id`),
  KEY `lic_eventos_data_inicio_idx` (`data_inicio`),
  CONSTRAINT `lic_eventos_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lic_eventos_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `lic_eventos_tipo_evento_id_fkey` FOREIGN KEY (`tipo_evento_id`) REFERENCES `lic_tipos_evento` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_oficios` (
  `id` varchar(191) NOT NULL,
  `processo_id` varchar(191) NOT NULL,
  `numero` varchar(191) NOT NULL,
  `data_email_enviado` date DEFAULT NULL,
  `data_recebimento_resposta` date DEFAULT NULL,
  `data_encerramento` date DEFAULT NULL,
  `interessado_nome` varchar(191) DEFAULT NULL,
  `observacao` text DEFAULT NULL,
  `tecnico_id` varchar(191) DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `lic_oficios_processo_id_idx` (`processo_id`),
  KEY `lic_oficios_numero_idx` (`numero`),
  KEY `lic_oficios_tecnico_id_fkey` (`tecnico_id`),
  CONSTRAINT `lic_oficios_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lic_oficios_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_processo_categorias` (
  `id` varchar(191) NOT NULL,
  `processo_id` varchar(191) NOT NULL,
  `categoria_id` varchar(191) NOT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lic_processo_categorias_processo_id_categoria_id_key` (`processo_id`,`categoria_id`),
  KEY `lic_processo_categorias_categoria_id_fkey` (`categoria_id`),
  CONSTRAINT `lic_processo_categorias_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `lic_categorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lic_processo_categorias_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_processo_imoveis` (
  `id` varchar(191) NOT NULL,
  `processo_id` varchar(191) NOT NULL,
  `tipo` enum('PRINCIPAL','COMPLEMENTAR') NOT NULL DEFAULT 'COMPLEMENTAR',
  `identificador` varchar(191) DEFAULT NULL,
  `logradouro` text DEFAULT NULL,
  `numero` varchar(191) DEFAULT NULL,
  `complemento` varchar(191) DEFAULT NULL,
  `cep` varchar(191) DEFAULT NULL,
  `ordem` int(11) NOT NULL DEFAULT 0,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `lic_processo_imoveis_processo_id_idx` (`processo_id`),
  KEY `lic_processo_imoveis_identificador_idx` (`identificador`),
  CONSTRAINT `lic_processo_imoveis_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_processo_incidencias` (
  `id` varchar(191) NOT NULL,
  `processo_id` varchar(191) NOT NULL,
  `tipo` varchar(191) NOT NULL,
  `flag` tinyint(1) NOT NULL DEFAULT 0,
  `valor` decimal(16,2) DEFAULT NULL,
  `data_doc` date DEFAULT NULL,
  `numero_documento` varchar(191) DEFAULT NULL,
  `observacao` text DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lic_processo_incidencias_processo_id_tipo_key` (`processo_id`,`tipo`),
  CONSTRAINT `lic_processo_incidencias_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_processo_interessados` (
  `id` varchar(191) NOT NULL,
  `processo_id` varchar(191) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `cpf_cnpj` varchar(191) DEFAULT NULL,
  `tipo_vinculo` varchar(191) NOT NULL DEFAULT 'PRINCIPAL',
  `ordem` int(11) NOT NULL DEFAULT 0,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `lic_processo_interessados_processo_id_idx` (`processo_id`),
  KEY `lic_processo_interessados_nome_idx` (`nome`),
  CONSTRAINT `lic_processo_interessados_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_processos` (
  `id` varchar(191) NOT NULL,
  `coordenadoria` enum('RESID','SERVIN','COMIN','CAEPP','PARHIS') NOT NULL,
  `status_ciclo` enum('ATIVO','ENCERRADO') NOT NULL DEFAULT 'ATIVO',
  `tipo_sistema` enum('SEI','FISICO','AD') DEFAULT NULL,
  `num_processo` varchar(191) NOT NULL,
  `protocolo` varchar(191) DEFAULT NULL,
  `prioritario` tinyint(1) NOT NULL DEFAULT 0,
  `processo_relacionado` varchar(191) DEFAULT NULL,
  `equipamento_publico` tinyint(1) NOT NULL DEFAULT 0,
  `instancia` varchar(191) DEFAULT NULL,
  `observacao` text DEFAULT NULL,
  `data_autuacao` date DEFAULT NULL,
  `data_envio_coordenadoria` date DEFAULT NULL,
  `data_ult_dist_diretoria` date DEFAULT NULL,
  `data_ult_dist_tecnico` date DEFAULT NULL,
  `data_despacho_doc` date DEFAULT NULL,
  `area_terreno_m2` decimal(16,2) DEFAULT NULL,
  `area_construcao_inicial_m2` decimal(16,2) DEFAULT NULL,
  `area_construcao_final_m2` decimal(16,2) DEFAULT NULL,
  `zona` varchar(191) DEFAULT NULL,
  `categoria_uso` varchar(191) DEFAULT NULL,
  `descricao_uso` text DEFAULT NULL,
  `subprefeitura` varchar(191) DEFAULT NULL,
  `base_legal_pde` varchar(191) DEFAULT NULL,
  `base_legal_lpuos` varchar(191) DEFAULT NULL,
  `base_legal_coe` varchar(191) DEFAULT NULL,
  `legislacao_especifica` text DEFAULT NULL,
  `documento_referencia` varchar(191) DEFAULT NULL,
  `divisao_id` varchar(191) DEFAULT NULL,
  `assunto_id` varchar(191) DEFAULT NULL,
  `situacao_id` varchar(191) DEFAULT NULL,
  `tecnico_atual_id` varchar(191) DEFAULT NULL,
  `processo_outorga_id` varchar(191) DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lic_processos_num_processo_key` (`num_processo`),
  UNIQUE KEY `lic_processos_processo_outorga_id_key` (`processo_outorga_id`),
  KEY `lic_processos_coordenadoria_idx` (`coordenadoria`),
  KEY `lic_processos_status_ciclo_idx` (`status_ciclo`),
  KEY `lic_processos_tipo_sistema_idx` (`tipo_sistema`),
  KEY `lic_processos_tecnico_atual_id_idx` (`tecnico_atual_id`),
  KEY `lic_processos_situacao_id_idx` (`situacao_id`),
  KEY `lic_processos_divisao_id_idx` (`divisao_id`),
  KEY `lic_processos_assunto_id_fkey` (`assunto_id`),
  CONSTRAINT `lic_processos_assunto_id_fkey` FOREIGN KEY (`assunto_id`) REFERENCES `lic_assuntos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `lic_processos_divisao_id_fkey` FOREIGN KEY (`divisao_id`) REFERENCES `lic_divisoes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `lic_processos_processo_outorga_id_fkey` FOREIGN KEY (`processo_outorga_id`) REFERENCES `processos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `lic_processos_situacao_id_fkey` FOREIGN KEY (`situacao_id`) REFERENCES `lic_situacoes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `lic_processos_tecnico_atual_id_fkey` FOREIGN KEY (`tecnico_atual_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_situacoes` (
  `id` varchar(191) NOT NULL,
  `coordenadoria` enum('RESID','SERVIN','COMIN','CAEPP','PARHIS') DEFAULT NULL,
  `codigo` varchar(191) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `encerra` tinyint(1) NOT NULL DEFAULT 0,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lic_situacoes_coordenadoria_codigo_key` (`coordenadoria`,`codigo`),
  KEY `lic_situacoes_codigo_idx` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lic_tipos_evento` (
  `id` varchar(191) NOT NULL,
  `coordenadoria` enum('RESID','SERVIN','COMIN','CAEPP','PARHIS') DEFAULT NULL,
  `categoria` enum('TECNICO','ADMINISTRATIVO','AUTOMATICO') NOT NULL,
  `codigo` varchar(191) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `criado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `alterado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lic_tipos_evento_coordenadoria_categoria_codigo_key` (`coordenadoria`,`categoria`,`codigo`),
  KEY `lic_tipos_evento_categoria_idx` (`categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
