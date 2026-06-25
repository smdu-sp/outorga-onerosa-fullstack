/** Novo Processo — formulário de identificação + chamada simulada à API de enquadramento. */
const { useState, useRef, useEffect } = React;

const ICON = {
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  plus: 'M12 5v14M5 12h14',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  folder: 'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  chevLeft: 'M15 18l-6-6 6-6',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  hash: 'M4 9h16M4 15h16M10 3L8 21M16 3l-2 18',
  mapPin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  check: 'M20 6L9 17l-5-5',
  checkCircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  spinner: 'M21 12a9 9 0 1 1-6.22-8.56',
  alert: 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  building: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9h.01M9 13h.01M9 17h.01',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  database: 'M12 8c4.42 0 8-1.34 8-3s-3.58-3-8-3-8 1.34-8 3 3.58 3 8 3z M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5 M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6',
  calc: 'M9 7h6m-6 4h.01M15 11h.01M9 15h.01M15 15h.01 M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  info: 'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
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
const LISTA_URL = 'Lista%20de%20Processos.html';
const fmtBRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtArea = (n) => n.toLocaleString('pt-BR') + ' m²';

/* ===== Base simulada "consultada" pela API (GeoSampa / cadastro) ===== */
const BASE = {
  '073.142.0021-0': {
    sql: '073.142.0021-0', processo: '6068.2024/0012345-6',
    enquadramento: {
      distrito: 'Itaim Bibi', subprefeitura: 'Pinheiros', macrozona: 'Estruturação e Qualificação Urbana',
      macroarea: 'Estruturação Metropolitana', subsetor: 'Arco Pinheiros',
      zonas: ['ZEU'], tipologia_uso_oodc: 'Misto (R + nR)',
    },
    parametros: { coeficiente_basico: 1, coeficiente_maximo: 4, area_terreno: 2400, valor_m2_quadro14: 9200, fator_planejamento: 1.0, fator_social: 0.7 },
  },
  '019.045.0008-3': {
    sql: '019.045.0008-3', processo: '6068.2025/0003187-2',
    enquadramento: {
      distrito: 'Lapa', subprefeitura: 'Lapa', macrozona: 'Estruturação e Qualificação Urbana',
      macroarea: 'Qualificação da Urbanização', subsetor: 'Eixo Marginal Tietê',
      zonas: ['ZM', 'ZC'], tipologia_uso_oodc: 'Não residencial (nR)',
    },
    parametros: { coeficiente_basico: 1, coeficiente_maximo: 2, area_terreno: 1180, valor_m2_quadro14: 5400, fator_planejamento: 1.0, fator_social: 1.0 },
  },
  '155.301.0042-7': {
    sql: '155.301.0042-7', processo: '6068.2025/0009921-0',
    enquadramento: {
      distrito: 'Santo Amaro', subprefeitura: 'Santo Amaro', macrozona: 'Estruturação e Qualificação Urbana',
      macroarea: 'Estruturação Metropolitana', subsetor: 'Arco Jurubatuba',
      zonas: ['ZEM'], tipologia_uso_oodc: 'Residencial (R)',
    },
    parametros: { coeficiente_basico: 1, coeficiente_maximo: 4, area_terreno: 3650, valor_m2_quadro14: 6800, fator_planejamento: 1.0, fator_social: 0.5 },
  },
};
// Índice cruzado por nº de processo
const POR_PROCESSO = {};
Object.values(BASE).forEach((r) => { POR_PROCESSO[r.processo] = r; });

const EXEMPLOS = [
  { modo: 'SQL', valor: '073.142.0021-0' },
  { modo: 'SQL', valor: '019.045.0008-3' },
  { modo: 'PROCESSO', valor: '6068.2025/0009921-0' },
];

const PIPE_STEPS = [
  { id: 'val', label: 'Validando identificador', icon: 'check' },
  { id: 'geo', label: 'Localizando lote no GeoSampa', icon: 'mapPin' },
  { id: 'enq', label: 'Apurando enquadramento urbanístico', icon: 'building' },
  { id: 'calc', label: 'Calculando parâmetros de outorga', icon: 'calc' },
];

const reSQL = /^\d{3}\.\d{3}\.\d{4}-\d$/;
const reProc = /^\d{4}\.\d{4}\/\d{7}-\d$/;

function Sidebar() {
  const itens = [
    { icon: 'home', label: 'Página Inicial' },
    { icon: 'folder', label: 'Processos', active: true, href: LISTA_URL },
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

function KV({ label, value, full, hl, zona }) {
  const empty = value == null || value === '';
  return (
    <div className={'kv' + (full ? ' kv-full' : '')}>
      <span className="kv-label">{label}</span>
      <span className={'kv-value' + (empty ? ' empty' : '') + (hl ? ' hl' : '') + (zona ? ' zona' : '')}>
        {empty ? '—' : value}
      </span>
    </div>
  );
}

function Pipeline({ step }) {
  return (
    <div className="pipe">
      {PIPE_STEPS.map((s, i) => {
        const state = i < step ? 'done' : i === step ? 'run' : 'wait';
        return (
          <div key={s.id} className={'pipe-step ' + state}>
            <span className="pipe-ic">
              {state === 'done' ? <Icon name="check" size={13} />
                : state === 'run' ? <Icon name="spinner" size={13} className="spin" />
                : <Icon name={s.icon} size={12} />}
            </span>
            {s.label}{state === 'run' ? '…' : ''}
          </div>
        );
      })}
    </div>
  );
}

function Resultado({ data, identificador }) {
  const e = data.enquadramento;
  const p = data.parametros;
  return (
    <div className="card fade-in">
      <div className="card-head">
        <div className="card-head-ic"><Icon name="building" size={18} /></div>
        <div>
          <div className="card-head-tt">Enquadramento Urbanístico</div>
          <div className="card-head-sub">Retornado pela API a partir de <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>{identificador}</b></div>
        </div>
        <span className="src-tag" style={{ marginLeft: 'auto' }}><Icon name="database" size={12} /> GeoSampa</span>
      </div>
      <div className="card-body">
        <div className="res-banner">
          <Icon name="checkCircle" size={18} />
          Lote localizado — enquadramento apurado com sucesso.
        </div>

        <div className="kv-grid">
          <KV label="Distrito" value={e.distrito} />
          <KV label="Subprefeitura" value={e.subprefeitura} />
          <KV label="Macrozona" value={e.macrozona} full />
          <KV label="Macroárea" value={e.macroarea} />
          <KV label="Subsetor" value={e.subsetor} />
          <KV label={'Zona' + (e.zonas.length > 1 ? 's' : '') + ' de Uso'} value={e.zonas.join('  ·  ')} zona full />
          <KV label="Tipologia de Uso OODC" value={e.tipologia_uso_oodc} full />
        </div>

        <div className="res-divider" />
        <p className="res-sub"><Icon name="calc" size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Parâmetros para cálculo da contrapartida</p>
        <div className="kv-grid">
          <KV label="Coeficiente Básico" value={p.coeficiente_basico} hl />
          <KV label="Coeficiente Máximo" value={p.coeficiente_maximo} hl />
          <KV label="Área do Terreno" value={fmtArea(p.area_terreno)} />
          <KV label="Valor m² (Quadro 14)" value={fmtBRL(p.valor_m2_quadro14)} />
          <KV label="Fator de Planejamento (Fp)" value={p.fator_planejamento.toFixed(1)} />
          <KV label="Fator Social (Fs)" value={p.fator_social.toFixed(1)} />
        </div>
      </div>
      <div className="res-foot">
        <div className="res-foot-note"><Icon name="info" size={14} /> Os campos serão pré-preenchidos no processo e poderão ser ajustados pelo DEUSO.</div>
        <div className="res-foot-actions">
          <a className="btn" href={LISTA_URL}>Cancelar</a>
          <a className="btn btn-primary btn-lg" href={DETALHE_URL + '?id=1'}>
            Criar processo <Icon name="arrowRight" size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [modo, setModo] = useState('SQL'); // 'SQL' | 'PROCESSO'
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');
  const [fase, setFase] = useState('idle'); // idle | loading | done
  const [step, setStep] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [usado, setUsado] = useState('');
  const inputRef = useRef(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const placeholder = modo === 'SQL' ? '000.000.0000-0' : '0000.0000/0000000-0';
  const labelInput = modo === 'SQL' ? 'SQL — Setor · Quadra · Lote' : 'Número do processo (SEI)';

  const trocarModo = (m) => { setModo(m); setErro(''); if (fase !== 'loading') { setValor(''); } };

  const validar = (v) => {
    if (!v.trim()) return 'Informe o ' + (modo === 'SQL' ? 'SQL do lote.' : 'número do processo.');
    if (modo === 'SQL' && !reSQL.test(v.trim())) return 'SQL inválido. Use o formato 000.000.0000-0.';
    if (modo === 'PROCESSO' && !reProc.test(v.trim())) return 'Número inválido. Use o formato 0000.0000/0000000-0.';
    return '';
  };

  const enviar = (e) => {
    e && e.preventDefault();
    if (fase === 'loading') return;
    const v = valor.trim();
    const msg = validar(v);
    if (msg) { setErro(msg); inputRef.current && inputRef.current.focus(); return; }
    setErro('');
    setResultado(null);
    setFase('loading');
    setStep(0);
    setUsado(v);

    // Avança o pipeline passo a passo (simula a API)
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const passo = (i, delay) => timers.current.push(setTimeout(() => setStep(i), delay));
    passo(1, 650);
    passo(2, 1350);
    passo(3, 2100);
    timers.current.push(setTimeout(() => {
      const found = modo === 'SQL' ? BASE[v] : POR_PROCESSO[v];
      // fallback: gera um registro plausível pra qualquer identificador válido
      const data = found || {
        enquadramento: {
          distrito: 'Consolação', subprefeitura: 'Sé', macrozona: 'Estruturação e Qualificação Urbana',
          macroarea: 'Estruturação Metropolitana', subsetor: 'Centro Histórico',
          zonas: ['ZC'], tipologia_uso_oodc: 'Misto (R + nR)',
        },
        parametros: { coeficiente_basico: 1, coeficiente_maximo: 4, area_terreno: 1500, valor_m2_quadro14: 7200, fator_planejamento: 1.0, fator_social: 1.0 },
      };
      setResultado(data);
      setFase('done');
    }, 2900));
  };

  const usarExemplo = (ex) => {
    setModo(ex.modo); setValor(ex.valor); setErro('');
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  };

  const reiniciar = () => { setFase('idle'); setResultado(null); setStep(0); inputRef.current && inputRef.current.focus(); };

  return (
    <div className="app">
      <Sidebar />
      <div className="novo-main">
        <div className="novo-wrap">
          <div className="bread">
            <a href={LISTA_URL}><Icon name="chevLeft" size={13} /> Processos</a>
            <span className="sep">/</span>
            <span>Novo processo</span>
          </div>

          <div className="novo-head">
            <h1>Novo processo</h1>
            <p>Informe o número do processo ou o SQL do lote. O sistema consulta a base cartográfica e calcula automaticamente o enquadramento urbanístico e os parâmetros de outorga.</p>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-head-ic"><Icon name="search" size={18} /></div>
              <div>
                <div className="card-head-tt">Identificação do imóvel</div>
                <div className="card-head-sub">Escolha como deseja localizar o lote</div>
              </div>
            </div>
            <div className="card-body">
              <div className="seg" role="tablist" style={{ marginBottom: 18 }}>
                <button className={modo === 'SQL' ? 'active' : ''} onClick={() => trocarModo('SQL')} disabled={fase === 'loading'}>
                  <Icon name="mapPin" size={15} /> SQL do lote
                </button>
                <button className={modo === 'PROCESSO' ? 'active' : ''} onClick={() => trocarModo('PROCESSO')} disabled={fase === 'loading'}>
                  <Icon name="hash" size={15} /> Número do processo
                </button>
              </div>

              <form onSubmit={enviar}>
                <label className="field-label">{labelInput}</label>
                <div className="field-row">
                  <div className="input-big">
                    <Icon name={modo === 'SQL' ? 'mapPin' : 'hash'} size={18} />
                    <input
                      ref={inputRef}
                      value={valor}
                      onChange={(e) => { setValor(e.target.value); if (erro) setErro(''); }}
                      placeholder={placeholder}
                      disabled={fase === 'loading'}
                      autoFocus
                      inputMode={modo === 'SQL' ? 'numeric' : 'text'}
                      spellCheck="false"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={fase === 'loading'}>
                    {fase === 'loading'
                      ? <><Icon name="spinner" size={16} className="spin" /> Consultando…</>
                      : <><Icon name="search" size={16} /> Consultar</>}
                  </button>
                </div>

                {erro
                  ? <div className="field-err"><Icon name="alert" size={14} /> {erro}</div>
                  : <div className="field-hint">
                      <Icon name="info" size={13} />
                      {modo === 'SQL'
                        ? <>Formato <code>Setor.Quadra.Lote-Dígito</code>, ex. <code>073.142.0021-0</code></>
                        : <>Formato SEI, ex. <code>6068.2024/0012345-6</code></>}
                    </div>}
              </form>

              {fase === 'idle' && (
                <div className="exemplos">
                  <span className="exemplos-lbl">Exemplos:</span>
                  {EXEMPLOS.map((ex) => (
                    <button key={ex.valor} type="button" className="chip-ex" onClick={() => usarExemplo(ex)}>{ex.valor}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {fase === 'loading' && (
            <div className="card fade-in">
              <div className="card-head">
                <div className="card-head-ic"><Icon name="layers" size={18} /></div>
                <div>
                  <div className="card-head-tt">Processando consulta</div>
                  <div className="card-head-sub">Identificador enviado para a API · <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>{usado}</b></div>
                </div>
              </div>
              <div className="card-body">
                <div className="sent-bar">
                  <span className="dot-pulse"></span>
                  Dados enviados · aguardando resposta do servidor
                  <span className="pct">{[15, 42, 70, 92][step]}%</span>
                </div>
                <div className="progress"><div className="progress-fill" style={{ width: [15, 42, 70, 92][step] + '%' }}></div></div>
                <Pipeline step={step} />
              </div>
            </div>
          )}

          {fase === 'done' && resultado && (
            <>
              <Resultado data={resultado} identificador={usado} />
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button className="btn" onClick={reiniciar}><Icon name="search" size={14} /> Consultar outro identificador</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
