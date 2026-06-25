/** Campos editáveis inline, tabelas e formatadores. Exporta p/ window. */
const { useState, useRef, useEffect } = React;

/* ---------------- Ícones (lucide-like, minimalistas) ---------------- */
const ICON_PATHS = {
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  check: 'M20 6 9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  history: 'M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l4 2',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  trendingDown: 'M22 17l-8.5-8.5-5 5L2 7M16 17h6v-6',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  keyboard: 'M10 8h.01M14 8h.01M18 8h.01M6 8h.01M7 12h10M6 16h12M4 4h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  building: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9h.01M9 13h.01M9 17h.01',
  folder: 'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
};
function Icon({ name, size = 16, className = '', strokeWidth = 2, style }) {
  const d = ICON_PATHS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}

/* ---------------- Formatadores ---------------- */
const toNum = (v) => {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? Number(v) : n;
};
const fmtCurrency = (v) => {
  const n = toNum(v);
  if (isNaN(n)) return '';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const fmtArea = (v) => {
  const n = toNum(v);
  if (isNaN(n)) return '';
  return n.toLocaleString('pt-BR') + ' m²';
};
const fmtNumber = (v) => {
  const n = toNum(v);
  if (isNaN(n)) return String(v ?? '');
  return n.toLocaleString('pt-BR');
};
const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v.length <= 10 ? v + 'T00:00:00' : v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('pt-BR');
};
const fmtDateTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const optLabel = (campo, value) => {
  if (!campo.options) return value;
  const o = campo.options.find((x) => x.value === value);
  return o ? o.label : value;
};
const displayValue = (campo, value) => {
  if (value === null || value === undefined || value === '') return '';
  switch (campo.type) {
    case 'currency': return fmtCurrency(value);
    case 'area': return fmtArea(value);
    case 'number': return fmtNumber(value);
    case 'date': return fmtDate(value);
    case 'datetime': return fmtDateTime(value);
    case 'select': return optLabel(campo, value);
    default: return String(value);
  }
};
const isEmpty = (v) => v === null || v === undefined || String(v).trim() === '';

/* ---------------- Campo editável (sempre editável, autosave no blur) ---------------- */
function EditableField({ campo, value, onCommit, onHistory, hasHistory, autoFocus }) {
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => { if (!focused) setLocal(value ?? ''); }, [value, focused]);

  const required = !!campo.required;
  const faltando = required && isEmpty(value);
  const readonly = !!campo.readonly;

  const commit = (v) => {
    setFocused(false);
    if (String(v ?? '') !== String(value ?? '')) onCommit(v);
  };

  const labelEl = (
    <div className="ef-label-row">
      <span className="ef-label">{campo.label}{required && <span className="ef-req">*</span>}</span>
      <span className="ef-label-meta">
        {hasHistory && (
          <button type="button" className="ef-hist" title="Histórico de alterações"
            onClick={(e) => { e.preventDefault(); onHistory && onHistory(); }}>
            <Icon name="history" size={12} />
          </button>
        )}
        {readonly && <Icon name="lock" size={11} className="ef-lock" />}
      </span>
    </div>
  );

  // ---- Read-only ----
  if (readonly) {
    return (
      <div className={'ef ef-ro' + (campo.full ? ' ef-full' : '') + (campo.destaque ? ' ef-destaque' : '')}>
        {labelEl}
        <div className="ef-ro-value">
          {isEmpty(value) ? <span className="ef-empty">—</span> : displayValue(campo, value)}
        </div>
        {campo.nota && <div className="ef-nota">{campo.nota}</div>}
      </div>
    );
  }

  const cls = 'ef-input' + (faltando ? ' ef-missing' : '') + (focused ? ' ef-focused' : '');

  let control;
  if (campo.type === 'select') {
    control = (
      <select className={cls} value={value ?? ''} autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={(e) => { setFocused(false); onCommit(e.target.value); }}>
        <option value="">— selecionar —</option>
        {campo.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  } else if (campo.type === 'textarea') {
    control = (
      <textarea className={cls + ' ef-textarea'} rows={focused ? 4 : 2} value={local} autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onChange={(e) => setLocal(e.target.value)} onBlur={() => commit(local)} />
    );
  } else if (campo.type === 'date') {
    control = (
      <input type="date" className={cls} value={value ? String(value).slice(0, 10) : ''} autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={(e) => { onCommit(e.target.value); }} />
    );
  } else {
    // text / number / currency / area — input texto com formatação ao sair do foco
    const shown = focused ? local : (isEmpty(value) ? '' : displayValue(campo, value));
    const numeric = campo.type === 'currency' || campo.type === 'area' || campo.type === 'number';
    control = (
      <input type="text" inputMode={numeric ? 'decimal' : 'text'} className={cls} value={shown} autoFocus={autoFocus}
        placeholder={faltando ? 'Obrigatório' : '—'}
        onFocus={() => { setFocused(true); setLocal(isEmpty(value) ? '' : (numeric ? String(toNum(value)).replace('.', ',') : value)); }}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => commit(numeric ? local.replace(/\s/g, '') : local)} />
    );
  }

  return (
    <div className={'ef' + (campo.full ? ' ef-full' : '')}>
      {labelEl}
      {control}
      {faltando && <div className="ef-hint-missing"><Icon name="alert" size={11} /> Campo obrigatório</div>}
    </div>
  );
}

/* ---------------- Grid de campos ---------------- */
function CamposGrid({ secao, dados, onField, onHistory, historico }) {
  return (
    <div className="campos-grid">
      {secao.campos.map((campo) => {
        const chave = secao.id + '.' + campo.key;
        return (
          <EditableField key={campo.key} campo={campo} value={dados ? dados[campo.key] : ''}
            hasHistory={!!(historico && historico[chave])}
            onHistory={() => onHistory && onHistory(campo, chave)}
            onCommit={(v) => onField(campo.key, v)} />
        );
      })}
    </div>
  );
}

/* ---------------- Badge de status de parcela ---------------- */
function StatusParcela({ p }) {
  if (p.quebra) return <span className="badge badge-quebra"><Icon name="trendingDown" size={12} /> Quebra</span>;
  if (p.status_quitacao === true || p.status_quitacao === 'true') {
    return <span className="badge badge-ok">{p.antecipada && <Icon name="zap" size={12} />}{p.antecipada ? ' Antecipada' : 'Quitada'}</span>;
  }
  return <span className="badge badge-pend">Pendente</span>;
}

/* ---------------- Tabela de parcelas (com ações) ---------------- */
function TabelaParcelas({ parcelas, onAcao }) {
  const total = parcelas.reduce((s, p) => s + toNum(p.valor || 0), 0);
  const pagas = parcelas.filter((p) => p.status_quitacao === true && !p.quebra).length;
  return (
    <div className="parcelas-bloco">
      <div className="tbl-resumo">
        <div><span className="tbl-resumo-num">{parcelas.length}</span> parcelas</div>
        <div><span className="tbl-resumo-num">{pagas}</span> quitadas</div>
        <div><span className="tbl-resumo-num">{fmtCurrency(total)}</span> total</div>
      </div>
      <div className="tbl-scroll">
      <table className="tbl">
        <thead>
          <tr>
            <th>Nº</th><th>Valor</th><th>Vencimento</th><th>Quitação</th><th>CPF/CNPJ</th><th>Situação</th><th className="tbl-acoes-h">Ações</th>
          </tr>
        </thead>
        <tbody>
          {parcelas.length === 0 && <tr><td colSpan={7} className="tbl-vazio">Nenhuma parcela cadastrada.</td></tr>}
          {parcelas.map((p) => (
            <tr key={p.id} className={p.quebra ? 'tr-quebra' : ''}>
              <td className="tbl-c">{p.num_parcela}</td>
              <td>{fmtCurrency(p.valor)}</td>
              <td className="tbl-c">{fmtDate(p.vencimento)}</td>
              <td className="tbl-c">{p.data_quitacao ? fmtDate(p.data_quitacao) : '—'}</td>
              <td>{p.cpf_cnpj}</td>
              <td className="tbl-c"><StatusParcela p={p} /></td>
              <td>
                <div className="tbl-acoes">
                  {!p.status_quitacao && !p.quebra && (
                    <button className="act act-zap" title="Munícipe antecipou o pagamento" aria-label="Registrar antecipação" onClick={() => onAcao(p.id, 'antecipar')}>
                      <Icon name="zap" size={15} />
                    </button>
                  )}
                  {!p.quebra ? (
                    <button className="act act-quebra" title="Munícipe parou de pagar (registrar quebra)" aria-label="Registrar quebra" onClick={() => onAcao(p.id, 'quebra')}>
                      <Icon name="trendingDown" size={15} />
                    </button>
                  ) : (
                    <button className="act act-undo" title="Reverter quebra" onClick={() => onAcao(p.id, 'reverter')}>
                      Reverter
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="tbl-legenda">
        <span><button className="act act-zap" tabIndex={-1}><Icon name="zap" size={14} /></button> Antecipar — munícipe pagou adiantado</span>
        <span><button className="act act-quebra" tabIndex={-1}><Icon name="trendingDown" size={14} /></button> Quebra — munícipe parou de pagar</span>
      </div>
    </div>
  );
}

/* ---------------- Tabela genérica editável (endereços / licenças) ---------------- */
function TabelaEditavel({ colunas, linhas, onCell, onAddRow, onDelRow, addLabel }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl tbl-edit">
        <thead>
          <tr>{colunas.map((c) => <th key={c.key}>{c.label}</th>)}<th className="tbl-acoes-h"></th></tr>
        </thead>
        <tbody>
          {linhas.length === 0 && <tr><td colSpan={colunas.length + 1} className="tbl-vazio">Nenhum registro. Use “{addLabel}”.</td></tr>}
          {linhas.map((linha, ri) => (
            <tr key={linha.id || ri}>
              {colunas.map((c) => (
                <td key={c.key}>
                  {c.type === 'select' ? (
                    <select className="cell-input" value={linha[c.key] ?? ''} onChange={(e) => onCell(ri, c.key, e.target.value)}>
                      <option value="">—</option>
                      {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : c.type === 'date' ? (
                    <input type="date" className="cell-input" value={linha[c.key] ? String(linha[c.key]).slice(0, 10) : ''} onChange={(e) => onCell(ri, c.key, e.target.value)} />
                  ) : (
                    <input type="text" className="cell-input" value={linha[c.key] ?? ''} onChange={(e) => onCell(ri, c.key, e.target.value)} />
                  )}
                </td>
              ))}
              <td className="tbl-c">
                <button className="cell-del" title="Remover" onClick={() => onDelRow(ri)}><Icon name="trash" size={13} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="add-row" onClick={onAddRow}><Icon name="plus" size={14} /> {addLabel}</button>
    </div>
  );
}

Object.assign(window, {
  Icon, EditableField, CamposGrid, TabelaParcelas, TabelaEditavel, StatusParcela,
  fmtCurrency, fmtArea, fmtNumber, fmtDate, fmtDateTime, displayValue, isEmpty, toNum,
});
