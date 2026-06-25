/** Dados de exemplo — Relatórios Outorga Onerosa SP */
(function () {
  // ── Meta anual R$ M ──
  const META_ANUAL = 1200;

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // ── 2026: detalhe mensal completo ──
  const D26 = {
    prev:   [85.2, 88.0, 95.5, 98.0,102.0,108.5,110.0,112.0,105.0, 98.0,103.0, 97.8],
    real:   [78.4,102.3, 88.7, 94.1, 97.8, 71.2, null, null, null, null, null, null],
    quebras:[2.1,   0.8,  4.3,  1.2,  6.7,  0.5, null, null, null, null, null, null],
    antec:  [0,    15.2,  0,    0,    0,    0,   null, null, null, null, null, null],
  };

  // ── Histórico de realizações (real) por ano ──
  const HIST = {
    2022:[62.1,70.8,77.3,79.2,82.4,84.7,83.1,87.6,79.4,83.8,90.7, 95.1],
    2023:[67.8,75.2,83.1,86.7,90.3,93.9,91.2,95.8,87.6,89.7,96.5,102.7],
    2024:[70.3,82.4,88.9,91.2,93.8,98.7,97.1,103.4,95.6,94.2,100.8,107.6],
    2025:[72.1,89.3,91.2,88.7,95.4,102.8,98.3,107.2,99.4,93.7,98.2,105.9],
  };

  // ── Top 10 maiores processos ──
  const TOP = [
    {id:1, num:'6068.2024/0002341-8',int:'Construtora MRV S.A.',    tipo:'PDE', total:28.4,pago:18.2,status:'andamento',sub:'Pinheiros',   venc:'2026-08-10'},
    {id:2, num:'6068.2023/0014520-1',int:'Even Construtora',         tipo:'PDE', total:22.7,pago:22.7,status:'quitado', sub:'Vila Mariana', venc:null},
    {id:3, num:'6068.2024/0008812-4',int:'Cyrela Brazil Realty',     tipo:'COTA',total:19.3,pago: 9.6,status:'andamento',sub:'Lapa',         venc:'2026-07-15'},
    {id:4, num:'6068.2025/0001102-7',int:'Brookfield Brasil',        tipo:'PDE', total:17.8,pago: 5.9,status:'andamento',sub:'Itaim Bibi',   venc:'2026-06-30'},
    {id:5, num:'6068.2023/0021890-3',int:'Helbor Empreendimentos',   tipo:'COTA',total:15.2,pago: 0.0,status:'quebra',   sub:'Sé',           venc:null},
    {id:6, num:'6068.2024/0006634-9',int:'Tecnisa S.A.',             tipo:'PDE', total:14.6,pago:14.6,status:'quitado', sub:'Pinheiros',     venc:null},
    {id:7, num:'6068.2025/0003341-2',int:'Direcional Engenharia',    tipo:'PDE', total:13.9,pago: 3.5,status:'andamento',sub:'Butantã',      venc:'2026-07-05'},
    {id:8, num:'6068.2024/0011203-6',int:'JHSF Participações',       tipo:'COTA',total:12.8,pago:12.8,status:'quitado', sub:'Itaim Bibi',   venc:null},
    {id:9, num:'6068.2023/0018904-5',int:'Gafisa S.A.',              tipo:'PDE', total:11.4,pago: 8.2,status:'andamento',sub:'Mooca',        venc:'2026-07-22'},
    {id:10,num:'6068.2025/0002201-0',int:'Eztec Empreendimentos',    tipo:'COTA',total:10.9,pago: 0.0,status:'quebra',   sub:'Lapa',         venc:null},
  ];

  // ── Arrecadação por subprefeitura (acumulado ano) ──
  const SUBS = [
    {nome:'Pinheiros',    val:87.3, proc:124},
    {nome:'Vila Mariana', val:64.2, proc:98 },
    {nome:'Itaim Bibi',   val:58.7, proc:87 },
    {nome:'Lapa',         val:47.1, proc:71 },
    {nome:'Sé',           val:42.8, proc:63 },
    {nome:'Mooca',        val:38.4, proc:54 },
    {nome:'Butantã',      val:35.9, proc:49 },
    {nome:'Santana',      val:24.7, proc:38 },
    {nome:'Penha',        val:19.2, proc:29 },
    {nome:'Ipiranga',     val:17.8, proc:26 },
    {nome:'Tatuapé',      val:15.4, proc:22 },
    {nome:"M'Boi Mirim",  val:12.1, proc:18 },
  ];

  // ── Vencimentos próximos (próx. 30 dias a partir de 18/06/2026) ──
  const ALERTAS = [
    {num:'6068.2025/0001102-7',int:'Brookfield Brasil',      val:2.97,venc:'30/06',dias:12,tipo:'PDE' },
    {num:'6068.2026/0000891-3',int:'Camargo Corrêa Imóveis', val:1.43,venc:'05/07',dias:17,tipo:'COTA'},
    {num:'6068.2025/0003341-2',int:'Direcional Engenharia',  val:1.16,venc:'05/07',dias:17,tipo:'PDE' },
    {num:'6068.2024/0015671-0',int:'Rossi Residencial',      val:0.87,venc:'10/07',dias:22,tipo:'PDE' },
    {num:'6068.2025/0007234-1',int:'Planeta Imóveis',        val:0.65,venc:'15/07',dias:27,tipo:'COTA'},
    {num:'6068.2024/0008812-4',int:'Cyrela Brazil Realty',   val:3.22,venc:'15/07',dias:27,tipo:'COTA'},
  ];

  window.REL = { META_ANUAL, MESES, D26, HIST, TOP, SUBS, ALERTAS };
})();
