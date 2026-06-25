/** Dados de exemplo para a lista de processos. */
(function () {
  const STATUS = { EM_PAGAMENTO: 'Em Pagamento', QUITADO: 'Quitado', QUEBRA: 'Quebra' };

  // parcelas: [pagas, total]
  const P = [
    { num: '2023.0.123.4567-8', tipo: 'PDE', status: 'EM_PAGAMENTO', interessado: 'Incorporadora Vila Nova Empreendimentos Ltda.', cpf_cnpj: '12.345.678/0001-90', parcelas: [2, 4], valor_total: 737000, valor_devido: 368500, entrada: '2023-04-18', protocolo: 'AD-2023-88120', detalhe: true },
    { num: '2024.0.045.1120-3', tipo: 'COTA', status: 'QUITADO', interessado: 'Construtora Horizonte Azul S.A.', cpf_cnpj: '98.765.432/0001-10', parcelas: [3, 3], valor_total: 412800, valor_devido: 0, entrada: '2024-01-22', protocolo: 'AD-2024-10233' },
    { num: '2022.0.987.6543-1', tipo: 'PDE', status: 'QUEBRA', interessado: 'Residencial Parque das Águas SPE Ltda.', cpf_cnpj: '45.221.908/0001-55', parcelas: [1, 5], valor_total: 1240000, valor_devido: 992000, entrada: '2022-09-30', protocolo: 'AD-2022-77410' },
    { num: '2024.0.331.0098-7', tipo: 'PDE', status: 'EM_PAGAMENTO', interessado: 'MRV Engenharia e Participações', cpf_cnpj: '08.343.492/0012-11', parcelas: [1, 3], valor_total: 568200, valor_devido: 378800, entrada: '2024-03-11', protocolo: 'AD-2024-30551' },
    { num: '2023.0.556.2210-4', tipo: 'COTA', status: 'EM_PAGAMENTO', interessado: 'Cyrela Brazil Realty', cpf_cnpj: '73.178.600/0001-18', parcelas: [2, 6], valor_total: 2150000, valor_devido: 1433333, entrada: '2023-07-05', protocolo: 'AD-2023-55021' },
    { num: '2021.0.114.8890-0', tipo: 'PDE', status: 'QUITADO', interessado: 'Tecnisa Engenharia', cpf_cnpj: '08.065.557/0001-12', parcelas: [4, 4], valor_total: 689400, valor_devido: 0, entrada: '2021-11-14', protocolo: 'AD-2021-66120' },
    { num: '2024.0.778.3401-9', tipo: 'COTA', status: 'EM_PAGAMENTO', interessado: 'Even Construtora e Incorporadora', cpf_cnpj: '43.470.988/0001-65', parcelas: [1, 4], valor_total: 945000, valor_devido: 708750, entrada: '2024-05-02', protocolo: 'AD-2024-78900' },
    { num: '2022.0.220.5567-2', tipo: 'PDE', status: 'QUEBRA', interessado: 'Mitre Realty SPE 14 Ltda.', cpf_cnpj: '22.778.341/0001-09', parcelas: [2, 5], valor_total: 1080000, valor_devido: 648000, entrada: '2022-06-19', protocolo: 'AD-2022-22015' },
    { num: '2023.0.902.1144-6', tipo: 'PDE', status: 'EM_PAGAMENTO', interessado: 'Trisul S.A. Incorporadora', cpf_cnpj: '08.811.643/0001-27', parcelas: [3, 5], valor_total: 1360000, valor_devido: 544000, entrada: '2023-10-28', protocolo: 'AD-2023-90112' },
    { num: '2024.0.118.7723-5', tipo: 'COTA', status: 'QUITADO', interessado: 'Lavvi Empreendimentos Imobiliários', cpf_cnpj: '84.022.190/0001-44', parcelas: [2, 2], valor_total: 318000, valor_devido: 0, entrada: '2024-02-09', protocolo: 'AD-2024-11200' },
    { num: '2021.0.667.9080-3', tipo: 'PDE', status: 'EM_PAGAMENTO', interessado: 'Direcional Engenharia', cpf_cnpj: '16.614.075/0001-95', parcelas: [4, 6], valor_total: 1725000, valor_devido: 575000, entrada: '2021-08-03', protocolo: 'AD-2021-66780' },
    { num: '2024.0.443.2219-1', tipo: 'COTA', status: 'EM_PAGAMENTO', interessado: 'Helbor Empreendimentos S.A.', cpf_cnpj: '49.263.189/0001-02', parcelas: [1, 3], valor_total: 612000, valor_devido: 408000, entrada: '2024-04-17', protocolo: 'AD-2024-44221' },
    { num: '2023.0.205.6612-8', tipo: 'PDE', status: 'QUITADO', interessado: 'Eztec Empreendimentos e Participações', cpf_cnpj: '08.312.229/0001-77', parcelas: [5, 5], valor_total: 1490000, valor_devido: 0, entrada: '2023-05-21', protocolo: 'AD-2023-20566' },
    { num: '2022.0.890.4432-0', tipo: 'PDE', status: 'EM_PAGAMENTO', interessado: 'You Inc Incorporadora', cpf_cnpj: '11.482.560/0001-31', parcelas: [2, 4], valor_total: 824000, valor_devido: 412000, entrada: '2022-12-07', protocolo: 'AD-2022-89044' },
  ];

  const processos = P.map((p, i) => ({ id: 'p-' + (1000 + i), ...p }));

  window.LISTA = { processos, STATUS };
})();
