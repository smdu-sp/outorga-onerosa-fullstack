/** Lista de processos — header, busca, filtros, tabela clicável, paginação. */
const { useState, useMemo } = React;

const ICON = {
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  plus: 'M12 5v14M5 12h14',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  folder: 'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  chevLeft: 'M15 18l-6-6 6-6',
  chevRight: 'M9 18l6-6-6-6',
  chevsLeft: 'M11 17l-5-5 5-5M18 17l-5-5 5-5',
  chevsRight: 'M13 17l5-5-5-5M6 17l5-5-5-5',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  clock: 'M12 7v5l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  check: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  trendingDown: 'M22 17l-8.5-8.5-5 5L2 7M16 17h6v-6',
  building: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9h.01M9 13h.01M9 17h.01',
};
function Icon({ name, size = 16, className = '', strokeWidth = 2 }) {
  const d = ICON[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}

const DETALHE_URL = 'Processo%20-%20Detalhe%20e%20Edicao.html';
const STATUS_LABEL = window.LISTA.STATUS;
const fmtBRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtData = (s) => { const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('pt-BR'); };

function Sidebar() {
  const itens = [
    { icon: 'home', label: 'Página Inicial' },
    { icon: 'folder', label: 'Processos', active: true },
  ];
  const admin = [{ icon: 'users', label: 'Usuários' }, { icon: 'lock', label: 'Permissões' }];
  return (
    <aside className="sidebar">
      <div className="sb-header">
        <div className="sb-logo"><img src="../assets/smul_icone_azul.png" alt="SMUL" /></div>
        <div className="sb-title"><b>Outorga Onerosa</b><span>Relatórios</span></div>
      </div>
      <nav className="sb-nav">
        <div className="sb-group-label">Geral</div>
        {itens.map((i) => (
          <a key={i.label} className={'sb-item' + (i.active ? ' active' : '')} href="#" onClick={(e) => e.preventDefault()}>
            <Icon name={i.icon} size={17} /> {i.label}
          </a>
        ))}
        <div className="sb-group-label" style={{ marginTop: 10 }}>Administração</div>
        {admin.map((i) => (
          <a key={i.label} className="sb-item" href="#" onClick={(e) => e.preventDefault()}>
            <Icon name={i.icon} size={17} /> {i.label}
          </a>
        ))}
      </nav>
      <div className="sb-footer">
        <div className="sb-avatar">AC</div>
        <div className="sb-user"><b>Ana Cardoso</b><span>DEUSO · SMUL</span></div>
      </div>
    </aside>
  );
}

function StatusBadge({ status }) {
  return <span className={'badge badge-' + status.toLowerCase()}>{STATUS_LABEL[status]}</span>;
}

function Parcelas({ p }) {
  const [pagas, total] = p.parcelas;
  const pct = Math.round((pagas / total) * 100);
  const cls = p.status === 'QUEBRA' ? 'broken' : pagas === total ? 'full' : '';
  return (
    <div className="parc">
      <span className="parc-label">{pagas}/{total}</span>
      <div className="parc-bar"><div className={'parc-fill ' + cls} style={{ width: pct + '%' }} /></div>
    </div>
  );
}

function StatCard({ icon, color, label, value, sub }) {
  return (
    <div className="stat">
      <div className="stat-top">
        <div className={'stat-icon ' + color}><Icon name={icon} size={16} /></div>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function App() {
  const todos = window.LISTA.processos;
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('TODOS');
  const [status, setStatus] = useState('TODOS');
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return todos.filter((p) => {
      if (tipo !== 'TODOS' && p.tipo !== tipo) return false;
      if (status !== 'TODOS' && p.status !== status) return false;
      if (q && !(p.num.toLowerCase().includes(q) || p.interessado.toLowerCase().includes(q) || p.cpf_cnpj.includes(q))) return false;
      return true;
    });
  }, [todos, busca, tipo, status]);

  const total = filtrados.length;
  const ultimaPag = Math.max(1, Math.ceil(total / limite));
  const pagAtual = Math.min(pagina, ultimaPag);
  const inicio = (pagAtual - 1) * limite;
  const pageItens = filtrados.slice(inicio, inicio + limite);

  const resetPag = (fn) => (v) => { fn(v); setPagina(1); };

  // métricas (sobre todos os processos, não filtrados)
  const emPagamento = todos.filter((p) => p.status === 'EM_PAGAMENTO').length;
  const quitados = todos.filter((p) => p.status === 'QUITADO').length;
  const quebras = todos.filter((p) => p.status === 'QUEBRA').length;
  const aReceber = todos.reduce((s, p) => s + p.valor_devido, 0);

  const irParaDetalhe = (p) => { window.location.href = DETALHE_URL + '?id=' + p.id; };

  const paginas = [];
  for (let i = 1; i <= ultimaPag; i++) paginas.push(i);

  return (
    <div className="app">
      <Sidebar />
      <div className="lista-main">
        <div className="lista-wrap">
          <div className="lista-head">
            <div>
              <h1>Processos</h1>
              <p>Consulte, acompanhe e edite os processos de outorga onerosa.</p>
            </div>
            <button className="btn btn-primary" onClick={() => { window.location.href = 'Novo%20Processo.html'; }}>
              <Icon name="plus" size={16} /> Novo processo
            </button>
          </div>

          <div className="stats">
            <StatCard icon="layers" color="blue" label="Total" value={todos.length} sub="processos cadastrados" />
            <StatCard icon="clock" color="amber" label="Em pagamento" value={emPagamento} sub="parcelas em curso" />
            <StatCard icon="check" color="green" label="Quitados" value={quitados} sub="contrapartida concluída" />
            <StatCard icon="trendingDown" color="red" label="Em quebra" value={quebras} sub={fmtBRL(aReceber) + ''} />
          </div>

          <div className="toolbar">
            <div className="busca">
              <Icon name="search" size={15} />
              <input value={busca} onChange={(e) => resetPag(setBusca)(e.target.value)} placeholder="Buscar por número, interessado ou CPF/CNPJ…" />
            </div>
            <div className="filtros">
              <div className="filtro-grp">
                {['TODOS', 'PDE', 'COTA'].map((t) => (
                  <button key={t} className={'filtro-btn' + (tipo === t ? ' active' : '')} onClick={() => resetPag(setTipo)(t)}>
                    {t === 'TODOS' ? 'Todos os tipos' : t}
                  </button>
                ))}
              </div>
              <div className="filtro-grp">
                {[['TODOS', 'Todos'], ['EM_PAGAMENTO', 'Em pagamento'], ['QUITADO', 'Quitado'], ['QUEBRA', 'Quebra']].map(([v, l]) => (
                  <button key={v} className={'filtro-btn' + (status === v ? ' active' : '')} onClick={() => resetPag(setStatus)(v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="lista-tbl-wrap">
            <div className="lista-tbl-scroll">
              <table className="lista-tbl">
                <thead>
                  <tr>
                    <th>Número do processo</th>
                    <th>Tipo</th>
                    <th>Interessado</th>
                    <th>Status</th>
                    <th className="th-c">Parcelas</th>
                    <th className="th-r">Valor devido</th>
                    <th className="th-c">Entrada</th>
                    <th className="th-r">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItens.length === 0 && (
                    <tr><td colSpan={8}><div className="lista-vazio">Nenhum processo encontrado com os filtros atuais.</div></td></tr>
                  )}
                  {pageItens.map((p) => (
                    <tr key={p.id} onClick={() => irParaDetalhe(p)}>
                      <td className="cel-num">{p.num}<small>{p.protocolo}</small></td>
                      <td><span className="badge badge-tipo">{p.tipo}</span></td>
                      <td className="cel-interessado">{p.interessado}<small>{p.cpf_cnpj}</small></td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="td-c"><Parcelas p={p} /></td>
                      <td className={'td-r cel-valor' + (p.valor_devido === 0 ? ' zero' : '')}>{p.valor_devido === 0 ? 'Quitado' : fmtBRL(p.valor_devido)}</td>
                      <td className="td-c cel-data">{fmtData(p.entrada)}</td>
                      <td className="td-r">
                        <a className="ver-link" href={DETALHE_URL + '?id=' + p.id} onClick={(e) => e.stopPropagation()}>
                          Ver / Editar <Icon name="arrowRight" size={14} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lista-foot">
            <div className="foot-info">
              {total > 0 ? <><b>{inicio + 1}</b>–<b>{Math.min(inicio + limite, total)}</b> de <b>{total}</b> processos</> : 'Nenhum processo'}
            </div>
            <div className="pager">
              <button className="pg" disabled={pagAtual === 1} onClick={() => setPagina(1)} title="Primeira"><Icon name="chevsLeft" size={15} /></button>
              <button className="pg" disabled={pagAtual === 1} onClick={() => setPagina(pagAtual - 1)} title="Anterior"><Icon name="chevLeft" size={15} /></button>
              {paginas.map((n) => (
                <button key={n} className={'pg' + (n === pagAtual ? ' active' : '')} onClick={() => setPagina(n)}>{n}</button>
              ))}
              <button className="pg" disabled={pagAtual === ultimaPag} onClick={() => setPagina(pagAtual + 1)} title="Próxima"><Icon name="chevRight" size={15} /></button>
              <button className="pg" disabled={pagAtual === ultimaPag} onClick={() => setPagina(ultimaPag)} title="Última"><Icon name="chevsRight" size={15} /></button>
            </div>
            <div className="foot-reg">
              Registros por página
              <select value={limite} onChange={(e) => resetPag(setLimite)(+e.target.value)}>
                {[5, 10, 15, 20, 50].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
