/** App: página dedicada de detalhe/edição do processo. */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const SECOES = window.MOCK.SECOES;
const ENUM = window.MOCK.enums;

/* ---- acesso a dados via caminho ("monitoramento.coordenada" etc) ---- */
function getVia(data, via) {
  if (!via) return data;
  return via.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), data);
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

/* ---- nº de campos editáveis vazios por seção (indicador "a preencher") ---- */
function contarVazios(secao, data) {
  if (secao.tipo !== 'grid') return 0;
  const dados = getVia(data, secao.via) || {};
  return secao.campos.filter((c) => !c.readonly && window.isEmpty(dados[c.key])).length;
}
function contarObrigatoriosVazios(secao, data) {
  if (secao.tipo !== 'grid') return 0;
  const dados = getVia(data, secao.via) || {};
  return secao.campos.filter((c) => c.required && window.isEmpty(dados[c.key])).length;
}

const GRUPOS = ['Processo', 'Monitoramento DEUSO', 'Cota de Solidariedade'];
const GRUPO_ICON = { 'Processo': 'folder', 'Monitoramento DEUSO': 'building', 'Cota de Solidariedade': 'home' };

function App() {
  const [data, setData] = useState(() => clone(window.MOCK.PROCESSO));
  const [activeId, setActiveId] = useState('processo');
  const [save, setSave] = useState({ state: 'idle', at: data.alterado_em });
  const [busca, setBusca] = useState('');
  const [drawer, setDrawer] = useState(null); // { campo, chave, label }
  const [toast, setToast] = useState(null);
  const [kbdOpen, setKbdOpen] = useState(false);
  const saveTimer = useRef(null);
  const toastTimer = useRef(null);
  const buscaRef = useRef(null);

  const historico = window.MOCK.HISTORICO;

  /* ---- autosave simulado ---- */
  const dispararSave = useCallback(() => {
    setSave({ state: 'saving', at: null });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const agora = new Date().toISOString();
      setData((d) => ({ ...d, alterado_em: agora }));
      setSave({ state: 'saved', at: agora });
    }, 650);
  }, []);

  const flashToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  /* ---- atualizar um campo de uma seção ---- */
  const atualizarCampo = (secao, key, value) => {
    setData((prev) => {
      const next = clone(prev);
      if (!secao.via) { next[key] = value; }
      else {
        const partes = secao.via.split('.');
        let alvo = next;
        for (let i = 0; i < partes.length; i++) {
          if (alvo[partes[i]] == null) alvo[partes[i]] = {};
          if (i === partes.length - 1) alvo[partes[i]][key] = value;
          else alvo = alvo[partes[i]];
        }
      }
      return next;
    });
    dispararSave();
  };

  /* ---- ações de parcela ---- */
  const acaoParcela = (id, acao) => {
    setData((prev) => {
      const next = clone(prev);
      const p = next.parcelas.find((x) => x.id === id);
      if (!p) return prev;
      if (acao === 'quebra') { p.quebra = true; p.status_quitacao = false; p.antecipada = false; }
      if (acao === 'reverter') { p.quebra = false; }
      if (acao === 'antecipar') { p.status_quitacao = true; p.antecipada = true; p.quebra = false; p.data_quitacao = new Date().toISOString().slice(0, 10); }
      // status geral derivado
      const temQuebra = next.parcelas.some((x) => x.quebra);
      const todasQuitadas = next.parcelas.every((x) => x.status_quitacao);
      next.status_pagamento = temQuebra ? 'QUEBRA' : todasQuitadas ? 'QUITADO' : 'EM_PAGAMENTO';
      return next;
    });
    dispararSave();
    flashToast(acao === 'quebra' ? 'Quebra registrada — município parou de pagar' : acao === 'antecipar' ? 'Pagamento antecipado registrado' : 'Quebra revertida');
  };

  /* ---- tabelas editáveis (endereços/licenças) ---- */
  const editarCelula = (via, ri, key, value) => {
    setData((prev) => {
      const next = clone(prev);
      const lista = getVia(next, via);
      if (lista && lista[ri]) lista[ri][key] = value;
      return next;
    });
    dispararSave();
  };
  const addLinha = (via, modelo) => {
    setData((prev) => {
      const next = clone(prev);
      const lista = getVia(next, via);
      if (lista) lista.push({ ...modelo, id: 'n' + Date.now() });
      return next;
    });
    dispararSave();
  };
  const delLinha = (via, ri) => {
    setData((prev) => {
      const next = clone(prev);
      const lista = getVia(next, via);
      if (lista) lista.splice(ri, 1);
      return next;
    });
    dispararSave();
  };

  const secoesVisiveis = useMemo(() => {
    if (!busca.trim()) return SECOES;
    const q = busca.toLowerCase();
    return SECOES.filter((s) =>
      s.titulo.toLowerCase().includes(q) ||
      s.tabela.toLowerCase().includes(q) ||
      (s.campos || []).some((c) => c.label.toLowerCase().includes(q))
    );
  }, [busca]);

  // garantir seção ativa visível
  useEffect(() => {
    if (busca.trim() && !secoesVisiveis.find((s) => s.id === activeId) && secoesVisiveis[0]) {
      setActiveId(secoesVisiveis[0].id);
    }
  }, [busca, secoesVisiveis, activeId]);

  /* ---- atalhos de teclado ---- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const editing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === '/' && !editing) { e.preventDefault(); buscaRef.current && buscaRef.current.focus(); return; }
      if (e.key === '?' && !editing) { e.preventDefault(); setKbdOpen((v) => !v); return; }
      if (e.key === 'Escape') { setDrawer(null); setKbdOpen(false); return; }
      if (editing) return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = secoesVisiveis.findIndex((s) => s.id === activeId);
        const nx = secoesVisiveis[Math.min(idx + 1, secoesVisiveis.length - 1)];
        if (nx) setActiveId(nx.id);
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = secoesVisiveis.findIndex((s) => s.id === activeId);
        const pv = secoesVisiveis[Math.max(idx - 1, 0)];
        if (pv) setActiveId(pv.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, secoesVisiveis]);

  const secao = SECOES.find((s) => s.id === activeId) || SECOES[0];
  const valorDevido = data.monitoramento_cota?.valor_devido;
  const valorTotal = data.monitoramento_cota?.valor_calculado_processo;

  const abrirHistorico = (campo, chave) => setDrawer({ campo, chave, label: campo.label });

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topo
          data={data} save={save} busca={busca} setBusca={setBusca} buscaRef={buscaRef}
          valorDevido={valorDevido} valorTotal={valorTotal}
          onPrint={() => window.print()} onKbd={() => setKbdOpen(true)}
        />
        <div className="corpo">
          <VerticalNav
            data={data} activeId={activeId} setActiveId={setActiveId}
            secoesVisiveis={secoesVisiveis} busca={busca}
          />
          <Painel
            secao={secao} data={data}
            onField={(key, v) => atualizarCampo(secao, key, v)}
            onAcaoParcela={acaoParcela}
            onCell={(ri, key, v) => editarCelula(secao.via, ri, key, v)}
            onAddRow={() => addLinha(secao.via, secao.id === 'enderecos'
              ? { ordem: (getVia(data, secao.via)?.length || 0) + 1, tipo: '', titulo: '', nome: '', numero: '' }
              : { tipo: '', numero: '', tipo_documento: '', data_expedicao: '' })}
            onDelRow={(ri) => delLinha(secao.via, ri)}
            onHistory={abrirHistorico}
            historico={historico}
            busca={busca}
          />
        </div>
      </div>

      <HistDrawer drawer={drawer} historico={historico} onClose={() => setDrawer(null)} />
      {kbdOpen && <KbdModal onClose={() => setKbdOpen(false)} />}
      {toast && (
        <div className="toast-wrap"><div className="toast"><Icon name="check" size={16} />{toast}</div></div>
      )}
    </div>
  );
}

/* ================= Sidebar (shell do app) ================= */
function Sidebar() {
  const itens = [
    { icon: 'home', label: 'Página Inicial' },
    { icon: 'folder', label: 'Processos', active: true, href: 'Lista%20de%20Processos.html' },
  ];
  const admin = [
    { icon: 'users', label: 'Usuários' },
    { icon: 'lock', label: 'Permissões' },
  ];
  return (
    <aside className="sidebar">
      <div className="sb-header">
        <div className="sb-logo"><img src="../assets/smul_icone_azul.png" alt="SMUL" /></div>
        <div className="sb-title"><b>Outorga Onerosa</b><span>Relatórios</span></div>
      </div>
      <nav className="sb-nav">
        <div className="sb-group-label">Geral</div>
        {itens.map((i) => (
          <a key={i.label} className={'sb-item' + (i.active ? ' active' : '')} href={i.href || '#'} onClick={i.href ? undefined : (e) => e.preventDefault()}>
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

/* ================= Cabeçalho fixo ================= */
function Topo({ data, save, busca, setBusca, buscaRef, valorDevido, valorTotal, onPrint, onKbd }) {
  const statusCls = 'badge badge-' + (data.status_pagamento || '').toLowerCase();
  return (
    <header className="topo">
      <div className="topo-bread">
        <a href="Lista%20de%20Processos.html"><Icon name="chevronLeft" size={14} /> Processos</a>
        <span className="sep">/</span>
        <span>{data.num_processo}</span>
      </div>
      <div className="topo-main">
        <div className="topo-id">
          <div className="topo-id-row">
            <div className="topo-num">{data.num_processo}</div>
            <span className="badge badge-tipo">{data.tipo}</span>
            <span className={statusCls}>{ENUM.STATUS_PAGAMENTO[data.status_pagamento] || data.status_pagamento}</span>
          </div>
          <div className="topo-facts">
            <div className="fact"><span className="fact-label">Valor total</span><span className="fact-value">{window.fmtCurrency(valorTotal)}</span></div>
            <div className="fact"><span className="fact-label">Valor devido</span><span className="fact-value due">{window.fmtCurrency(valorDevido)}</span></div>
            <div className="fact"><span className="fact-label">Data de entrada</span><span className="fact-value">{window.fmtDate(data.data_entrada)}</span></div>
          </div>
        </div>
        <div className="topo-actions">
          <SaveIndicator save={save} />
          <div className="busca">
            <Icon name="search" size={15} />
            <input ref={buscaRef} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar campo…  ( / )" />
          </div>
          <button className="btn" onClick={onKbd} title="Atalhos de teclado"><Icon name="keyboard" size={16} /></button>
          <button className="btn" onClick={onPrint}><Icon name="download" size={15} /> Exportar</button>
        </div>
      </div>
    </header>
  );
}

function SaveIndicator({ save }) {
  if (save.state === 'saving') return <span className="save-ind save-saving"><Icon name="history" size={14} className="spin" /> Salvando…</span>;
  if (save.state === 'saved') return <span className="save-ind save-saved"><Icon name="check" size={14} /> Salvo {save.at ? '· ' + window.fmtDateTime(save.at).split(' ')[1] : ''}</span>;
  return <span className="save-ind save-idle"><span className="save-dot" /> Alterações salvas automaticamente</span>;
}

/* ================= Navegação vertical agrupada ================= */
function VerticalNav({ data, activeId, setActiveId, secoesVisiveis, busca }) {
  const visibleIds = new Set(secoesVisiveis.map((s) => s.id));
  return (
    <nav className="vnav">
      {GRUPOS.map((grupo) => {
        const secoesGrupo = SECOES.filter((s) => s.grupo === grupo);
        const algumaVisivel = secoesGrupo.some((s) => visibleIds.has(s.id));
        if (busca.trim() && !algumaVisivel) return null;
        return (
          <div className="vnav-group" key={grupo}>
            <div className="vnav-group-label"><Icon name={GRUPO_ICON[grupo]} size={13} /> {grupo}</div>
            {secoesGrupo.map((s) => {
              const oculto = busca.trim() && !visibleIds.has(s.id);
              const obrig = contarObrigatoriosVazios(s, data);
              const vazios = contarVazios(s, data);
              const isCalc = s.calculado;
              return (
                <button key={s.id} className={'vnav-item' + (s.id === activeId ? ' active' : '') + (oculto ? ' vnav-hidden' : '')}
                  onClick={() => setActiveId(s.id)}>
                  <span className="vnav-label">{s.titulo}</span>
                  {isCalc ? (
                    <span className="vnav-pill lock"><Icon name="lock" size={10} /></span>
                  ) : obrig > 0 ? (
                    <span className="vnav-pill amber" title={obrig + ' campo(s) obrigatório(s) a preencher'}>{obrig}</span>
                  ) : vazios > 0 ? (
                    <span className="vnav-pill count" title={vazios + ' campo(s) a preencher'}>{vazios}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

/* ================= Painel de conteúdo ================= */
function Painel({ secao, data, onField, onAcaoParcela, onCell, onAddRow, onDelRow, onHistory, historico, busca }) {
  const dados = getVia(data, secao.via);
  const vazios = contarVazios(secao, data);
  const total = secao.tipo === 'grid' ? secao.campos.filter((c) => !c.readonly).length : null;

  return (
    <section className="painel">
      <div className="painel-head">
        <div>
          <div className="painel-title">{secao.titulo}</div>
          <div className="painel-tabela">{secao.tabela}</div>
        </div>
        <div className="painel-meta">
          {secao.tipo === 'grid' && !secao.calculado && (
            <span>{total - vazios}/{total} preenchidos{vazios > 0 ? <> · <b style={{ color: 'oklch(0.5 0.13 70)' }}>{vazios} a preencher</b></> : ' ✓'}</span>
          )}
          <span>Alterado em <b>{window.fmtDateTime(data.alterado_em)}</b></span>
        </div>
      </div>
      <div className="painel-body">
        {secao.calculado && (
          <div className="aviso-calc">
            <Icon name="lock" size={15} />
            Valores calculados automaticamente pelo sistema a partir das áreas e coeficientes. Somente leitura.
          </div>
        )}
        {secao.tipo === 'grid' && (
          <BuscaGrid secao={secao} dados={dados} onField={onField} onHistory={onHistory} historico={historico} busca={busca} />
        )}
        {secao.tipo === 'parcelas' && (
          <TabelaParcelas parcelas={data.parcelas || []} onAcao={onAcaoParcela} />
        )}
        {secao.tipo === 'enderecos' && (
          <TabelaEditavel colunas={window.MOCK.COLUNAS_ENDERECO} linhas={dados || []}
            onCell={onCell} onAddRow={onAddRow} onDelRow={onDelRow} addLabel="Adicionar endereço" />
        )}
        {secao.tipo === 'licencas' && (
          <TabelaEditavel colunas={window.MOCK.COLUNAS_LICENCA} linhas={dados || []}
            onCell={onCell} onAddRow={onAddRow} onDelRow={onDelRow} addLabel="Adicionar licença" />
        )}
      </div>
    </section>
  );
}

/* grid com destaque de busca por campo */
function BuscaGrid({ secao, dados, onField, onHistory, historico, busca }) {
  const q = busca.trim().toLowerCase();
  return (
    <div className="campos-grid">
      {secao.campos.map((campo) => {
        const chave = secao.id + '.' + campo.key;
        const hl = q && campo.label.toLowerCase().includes(q);
        return (
          <div key={campo.key} className={(campo.full ? 'ef-full ' : '') + (hl ? 'field-hl' : '')} style={campo.full ? {} : null}>
            <EditableField campo={campo} value={dados ? dados[campo.key] : ''}
              hasHistory={!!(historico && historico[chave])}
              onHistory={() => onHistory(campo, chave)}
              onCommit={(v) => onField(campo.key, v)} />
          </div>
        );
      })}
    </div>
  );
}

/* ================= Drawer de histórico ================= */
function HistDrawer({ drawer, historico, onClose }) {
  const itens = drawer && historico[drawer.chave] ? historico[drawer.chave] : [];
  return (
    <>
      <div className={'drawer-overlay' + (drawer ? ' open' : '')} onClick={onClose} />
      <aside className={'drawer' + (drawer ? ' open' : '')}>
        <div className="drawer-head">
          <div>
            <h3>Histórico de alterações</h3>
            <p>{drawer ? drawer.label : ''}</p>
          </div>
          <button className="drawer-close" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="drawer-body">
          {itens.length === 0 && <p className="hist-vazio">Nenhuma alteração registrada para este campo.</p>}
          {itens.map((h, i) => (
            <div className="hist-item" key={i}>
              <div className="hist-dot" />
              <div>
                <div className="hist-user">{h.usuario}</div>
                <div className="hist-em">{window.fmtDateTime(h.em)}</div>
                <div className="hist-change">
                  <span className="hist-de">{h.de || '—'}</span>
                  <Icon name="chevronRight" size={12} />
                  <span className="hist-para">{h.para}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

/* ================= Modal de atalhos ================= */
function KbdModal({ onClose }) {
  const linhas = [
    ['Próxima seção', ['J', '↓']],
    ['Seção anterior', ['K', '↑']],
    ['Buscar campo', ['/']],
    ['Esta ajuda', ['?']],
    ['Fechar', ['Esc']],
  ];
  return (
    <div className="kbd-modal-overlay" onClick={onClose}>
      <div className="kbd-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Atalhos de teclado</h3>
        {linhas.map(([nome, teclas]) => (
          <div className="kbd-row" key={nome}>
            <span>{nome}</span>
            <span style={{ display: 'flex', gap: 6 }}>{teclas.map((t) => <kbd key={t}>{t}</kbd>)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
