/** Relatórios — Outorga Onerosa de SP */
const { useState, useEffect, useRef, useMemo } = React;

const D = window.REL;
const MES_ATUAL = 5; // Junho 2026 (0-based)
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/* ── Formatters ── */
const fmtM   = (v,d=1) => v==null?'—':'R$\u00a0'+v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'M';
const fmtPct = (v,d=1) => v==null?'—':v.toFixed(d)+'%';

/* ── Icons ── */
const IP = {
  bar:    'M18 20V10M12 20V4M6 20v-6',
  line:   'M22 12h-4l-3 9L9 3l-3 9H2',
  pie:    'M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  cal:    'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  trend:  'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  warn:   'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  check:  'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  folder: 'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  users:  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  home:   'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  lock:   'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  down:   'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  bell:   'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  map:    'M3 11l19-9-9 19-2-8-8-2z',
  x:      'M18 6L6 18M6 6l12 12',
};
function Ic({ n, s=15, sw=2, cls='', style }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={cls} style={style} aria-hidden="true">
      {(IP[n]||'').split(/(?=M)/).filter(Boolean).map((p,i)=><path key={i} d={p}/>)}
    </svg>
  );
}

/* ── Sidebar ── */
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sb-header">
        <div className="sb-logo"><img src="../assets/smul_icone_azul.png" alt="SMUL"/></div>
        <div className="sb-title"><b>Outorga Onerosa</b><span>Relatórios</span></div>
      </div>
      <nav className="sb-nav">
        <div className="sb-group-label">Geral</div>
        <a className="sb-item" href="Lista de Processos.html"><Ic n="home" s={17}/> Página Inicial</a>
        <a className="sb-item" href="Lista de Processos.html"><Ic n="folder" s={17}/> Processos</a>
        <a className="sb-item active" href="#"><Ic n="bar" s={17}/> Relatórios</a>
        <div className="sb-group-label" style={{marginTop:10}}>Administração</div>
        <a className="sb-item" href="#" onClick={e=>e.preventDefault()}><Ic n="users" s={17}/> Usuários</a>
        <a className="sb-item" href="#" onClick={e=>e.preventDefault()}><Ic n="lock" s={17}/> Permissões</a>
      </nav>
      <div className="sb-footer">
        <div className="sb-avatar">AC</div>
        <div className="sb-user"><b>Ana Cardoso</b><span>DEUSO · SMUL</span></div>
      </div>
    </aside>
  );
}

/* ── KPI Section ── */
function KpiSection() {
  const { D26, META_ANUAL } = D;
  const totalReal   = D26.real.filter(v=>v!=null).reduce((a,b)=>a+b,0);
  const totalQuebras= D26.quebras.filter(v=>v!=null).reduce((a,b)=>a+b,0);
  const totalAntec  = D26.antec.filter(v=>v!=null).reduce((a,b)=>a+b,0);
  const remaining   = D26.prev.slice(MES_ATUAL+1).reduce((a,b)=>a+b,0);
  const pctMeta     = totalReal / META_ANUAL * 100;
  const inadimpl    = totalQuebras / (totalReal + totalQuebras) * 100;

  const cards = [
    { label:'Arrecadado 2026',   value:fmtM(totalReal,0),  sub:fmtPct(pctMeta)+' da meta anual',      icon:'bar',    color:'primary', bar:pctMeta  },
    { label:'A Receber Líquido', value:fmtM(remaining-18,0),sub:'Jul–Dez 2026 (aj. quebras est.)',    icon:'trend',  color:'',        bar:null     },
    { label:'Valor em Quebras',  value:fmtM(totalQuebras), sub:'Acordos encerrados por parte do munícipio', icon:'warn',   color:'amber',   bar:null     },
    { label:'Antecipações',      value:fmtM(totalAntec),   sub:'Pago antes do vencimento',           icon:'check',  color:'purple',  bar:null     },
    { label:'Processos Ativos',  value:'1.847',            sub:'PDE: 1.103 · COTA: 744',             icon:'folder', color:'',        bar:null     },
    { label:'Taxa Inadimplência',value:fmtPct(inadimpl),   sub:'Valor perdido / total esperado',     icon:'x',      color:'red',     bar:null     },
  ];

  return (
    <div className="kpi-grid">
      {cards.map(c => (
        <div key={c.label} className="kpi-card">
          <div className="kpi-label"><Ic n={c.icon} s={11}/> {c.label}</div>
          <div className={'kpi-value'+(c.color?' kpi-'+c.color:'')}>{c.value}</div>
          <div className="kpi-sub">{c.sub}</div>
          {c.bar!=null && (
            <div className="kpi-bar">
              <div className="kpi-bar-fill" style={{width:Math.min(c.bar,100)+'%',
                background:c.bar>=95?'#16a34a':c.bar>=80?'#d97706':'#dc2626'}}/>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Month Card ── */
function MonthCard({ idx }) {
  const d = D.D26;
  const prev = d.prev[idx], real = d.real[idx];
  const quebra = d.quebras[idx] || 0, antec = d.antec[idx] || 0;
  const isFuturo = idx > MES_ATUAL, isAtual = idx === MES_ATUAL;
  const pct = (real != null && prev) ? Math.round(real / prev * 100) : null;
  const fillColor = isAtual?'#3b82f6':pct>=95?'#16a34a':pct>=80?'#d97706':'#dc2626';
  const dotColor  = isFuturo?'#cbd5e1':isAtual?'#3b82f6':pct>=95?'#16a34a':pct>=80?'#d97706':'#dc2626';

  let cls = 'month-card';
  if (isAtual) cls += ' mc-atual';
  else if (isFuturo) cls += ' mc-futuro';
  else if (quebra > 2) cls += ' mc-quebra';

  return (
    <div className={cls}>
      <div className="mc-head">
        <span className="mc-nome">{D.MESES[idx]}</span>
        <span className="mc-status-dot" style={{background:dotColor,
          boxShadow:isAtual?'0 0 0 3px rgba(59,130,246,0.18)':undefined}}/>
      </div>
      <div className="mc-real" style={{color:isFuturo?'var(--muted-foreground)':undefined}}>
        {real != null ? fmtM(real) : <span style={{fontSize:13}}>—</span>}
      </div>
      <div className="mc-prev">prev. {fmtM(prev)}</div>
      <div className="mc-prog">
        {real != null && <div className="mc-prog-fill" style={{width:Math.min(pct,100)+'%',background:fillColor}}/>}
      </div>
      <div className="mc-pct" style={{color:pct!=null&&pct<80?'#dc2626':undefined}}>
        {pct!=null ? fmtPct(pct,0) : isAtual ? 'em andamento' : 'previsto'}
      </div>
      <div className="mc-tags">
        {quebra > 0 && <span className="mc-tag mc-tag-quebra">⚠ Quebra {fmtM(quebra)}</span>}
        {antec  > 0 && <span className="mc-tag mc-tag-antec">↑ Antec. {fmtM(antec)}</span>}
      </div>
    </div>
  );
}

/* ── Calendar Section ── */
function CalendarSection() {
  return (
    <div className="section-card">
      <div className="section-title">
        <Ic n="cal" s={14}/> Calendário de Arrecadação — 2026
        <span className="badge">Ano corrente</span>
      </div>
      <div className="cal-grid">
        {D.MESES.map((_,i) => <MonthCard key={i} idx={i}/>)}
      </div>
    </div>
  );
}

/* ── Chart.js wrapper ── */
function ChartBox({ type, makeData, height=220 }) {
  const canvasRef = useRef();
  useEffect(() => {
    if (!window.Chart || !canvasRef.current) return;
    Chart.defaults.font.family = "'Sora', sans-serif";
    Chart.defaults.font.size = 11;
    const { data, options } = makeData();
    const chart = new Chart(canvasRef.current, { type, data, options });
    return () => chart.destroy();
  }, []);
  return (
    <div style={{position:'relative',height,width:'100%'}}>
      <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
    </div>
  );
}

/* ── Bar Chart: Previsto vs Realizado ── */
function BarChartSection() {
  function makeData() {
    const d = D.D26;
    return {
      data: {
        labels: D.MESES,
        datasets: [
          {
            label:'Previsto', data:d.prev,
            backgroundColor:'rgba(148,163,184,0.4)', borderColor:'rgba(148,163,184,0.7)',
            borderWidth:1, borderRadius:3, order:2,
          },
          {
            label:'Realizado', data:d.real,
            backgroundColor: d.real.map((v,i)=> {
              if(v==null) return 'rgba(0,0,0,0)';
              if(i===MES_ATUAL) return 'rgba(59,130,246,0.82)';
              const r=v/d.prev[i];
              return r>=0.95?'rgba(22,163,74,0.82)':r>=0.80?'rgba(217,119,6,0.82)':'rgba(220,38,38,0.82)';
            }),
            borderRadius:3, order:1,
          },
        ],
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{position:'bottom',labels:{boxWidth:10,padding:14}},
          tooltip:{callbacks:{label:ctx=>' '+ctx.dataset.label+': '+fmtM(ctx.raw)}},
        },
        scales:{
          y:{min:50,ticks:{callback:v=>'R$'+v+'M',font:{size:10}},grid:{color:'rgba(0,0,0,0.04)'}},
          x:{ticks:{font:{size:10}},grid:{display:false}},
        },
      },
    };
  }
  return (
    <div className="chart-card">
      <div className="chart-title"><Ic n="bar" s={13}/> Previsto vs Realizado por Mês</div>
      <ChartBox type="bar" makeData={makeData}/>
    </div>
  );
}

/* ── Line Chart: Acumulado ── */
function LineChartSection() {
  function makeData() {
    const hist25 = D.HIST[2025];
    const d26    = D.D26;

    let s=0;
    const cum25 = hist25.map(v=>{s+=v;return+(s.toFixed(1));});

    let s2=0;
    const cum26act = d26.real.map(v=>v!=null?(s2+=v,+(s2.toFixed(1))):null);

    let base = cum26act.filter(v=>v!=null).slice(-1)[0];
    const cum26frc = d26.prev.map((pv,i)=>{
      if(i<MES_ATUAL) return null;
      if(i===MES_ATUAL) return cum26act[i];
      base+=pv*0.97;
      return+(base.toFixed(1));
    });

    return {
      data:{
        labels:D.MESES,
        datasets:[
          {label:'2025',data:cum25,borderColor:'rgba(148,163,184,0.8)',backgroundColor:'transparent',borderWidth:1.5,pointRadius:2,tension:0.35},
          {label:'2026 Realizado',data:cum26act,borderColor:'#1e3a7a',backgroundColor:'rgba(30,58,122,0.06)',fill:true,borderWidth:2.5,pointRadius:3,tension:0.35},
          {label:'2026 Projeção',data:cum26frc,borderColor:'#3b82f6',backgroundColor:'transparent',borderWidth:2,borderDash:[5,4],pointRadius:2,tension:0.35},
          {label:'Meta anual',data:D.MESES.map(()=>D.META_ANUAL),borderColor:'rgba(220,38,38,0.45)',backgroundColor:'transparent',borderWidth:1,borderDash:[3,3],pointRadius:0},
        ],
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{position:'bottom',labels:{boxWidth:10,padding:14}},
          tooltip:{callbacks:{label:ctx=>' '+ctx.dataset.label+': '+fmtM(ctx.raw,0)}},
        },
        scales:{
          y:{ticks:{callback:v=>'R$'+v+'M',font:{size:10}},grid:{color:'rgba(0,0,0,0.04)'}},
          x:{ticks:{font:{size:10}},grid:{display:false}},
        },
      },
    };
  }
  return (
    <div className="chart-card">
      <div className="chart-title"><Ic n="line" s={13}/> Acumulado + Projeção de Fechamento</div>
      <ChartBox type="line" makeData={makeData}/>
    </div>
  );
}

/* ── Donut: Composição da Carteira ── */
function DonutSection() {
  const d = D.D26;
  const totalReal  = d.real.filter(Boolean).reduce((a,b)=>a+b,0);
  const totalAntec = d.antec.filter(Boolean).reduce((a,b)=>a+b,0);
  const totalQuebras = d.quebras.filter(Boolean).reduce((a,b)=>a+b,0);
  const normal     = +(totalReal - totalAntec).toFixed(1);
  const aReceber   = +(D.META_ANUAL - totalReal - totalQuebras).toFixed(1);

  function makeData() {
    return {
      data:{
        labels:['Pgtos. regulares','Antecipações','Quebras (perdas)','A receber'],
        datasets:[{
          data:[normal, totalAntec, totalQuebras, Math.max(aReceber,0)],
          backgroundColor:['#1e3a7a','#7c3aed','#f59e0b','#e2e8f0'],
          borderWidth:2, borderColor:'#fff', hoverOffset:5,
        }],
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{label:ctx=>' '+ctx.label+': '+fmtM(ctx.raw,0)}},
        },
      },
    };
  }
  const leg=[
    {c:'#1e3a7a',l:'Pgtos. regulares',v:fmtM(normal,0)},
    {c:'#7c3aed',l:'Antecipações',v:fmtM(totalAntec)},
    {c:'#f59e0b',l:'Quebras',v:fmtM(totalQuebras)},
    {c:'#e2e8f0',l:'A receber',v:fmtM(aReceber,0)},
  ];
  return (
    <div className="chart-card">
      <div className="chart-title"><Ic n="pie" s={13}/> Composição da Carteira 2026</div>
      <div className="donut-row">
        <div className="donut-canvas-wrap">
          <ChartBox type="doughnut" makeData={makeData} height={170}/>
        </div>
        <div className="donut-legend">
          {leg.map(l=>(
            <div key={l.l} className="leg-item">
              <span className="leg-dot" style={{background:l.c}}/>
              <span style={{flex:1,color:'var(--muted-foreground)',fontSize:12}}>{l.l}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600}}>{l.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Heatmap SVG ── */
function Heatmap() {
  const [tip, setTip] = useState(null);
  const anos = [2022,2023,2024,2025,2026];
  const allVals = anos.flatMap(y=>{
    const row = y===2026 ? D.D26.real : D.HIST[y];
    return row.filter(v=>v!=null);
  });
  const maxV = Math.max(...allVals);
  const CW=46, CH=26, G=2, PL=50, PT=22;
  const W = PL+(CW+G)*12+4;
  const H = PT+(CH+G)*anos.length+12;

  function cellColor(val) {
    if(val==null) return '#f1f5f9';
    const t = Math.min(val/maxV,1);
    return `rgba(30,58,122,${(0.07+t*0.87).toFixed(2)})`;
  }
  function textFill(val) {
    return (val!=null && val/maxV>0.52) ? '#fff' : '#1e3a7a';
  }

  return (
    <div className="chart-card" style={{position:'relative'}}>
      <div className="chart-title"><Ic n="cal" s={13}/> Heatmap — Arrecadação Mensal (R$ M)</div>
      <div className="heatmap-wrap">
        <svg width={W} height={H} className="heatmap-svg">
          {D.MESES.map((m,i)=>(
            <text key={m} x={PL+(CW+G)*i+CW/2} y={16} textAnchor="middle"
              fontSize={9.5} fill="#94a3b8" fontFamily="Sora,sans-serif">{m}</text>
          ))}
          {anos.map((ano,ri)=>{
            const row = ano===2026 ? D.D26.real : D.HIST[ano];
            const cy = PT+(CH+G)*ri;
            return (
              <g key={ano}>
                <text x={PL-7} y={cy+CH/2+4} textAnchor="end" fontSize={10}
                  fill="#64748b" fontFamily="Sora,sans-serif">{ano}</text>
                {D.MESES.map((_,ci)=>{
                  const val=row[ci];
                  const cx=PL+(CW+G)*ci;
                  return (
                    <g key={ci}
                      onMouseEnter={e=>setTip({ano,mes:D.MESES[ci],val,x:e.clientX,y:e.clientY})}
                      onMouseLeave={()=>setTip(null)}
                      style={{cursor:'default'}}>
                      <rect x={cx} y={cy} width={CW} height={CH} rx={4} fill={cellColor(val)}/>
                      {val!=null && (
                        <text x={cx+CW/2} y={cy+CH/2+3.5} textAnchor="middle"
                          fontSize={9} fill={textFill(val)} fontWeight="600"
                          fontFamily="'JetBrains Mono',monospace">
                          {val.toFixed(0)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      {tip && (
        <div style={{position:'fixed',left:tip.x+12,top:tip.y-34,
          background:'#1e293b',color:'#fff',padding:'4px 10px',
          borderRadius:6,fontSize:12,pointerEvents:'none',zIndex:9999,whiteSpace:'nowrap'}}>
          {tip.mes}/{tip.ano}: {tip.val!=null?fmtM(tip.val):'sem dado'}
        </div>
      )}
    </div>
  );
}

/* ── Top 10 Table ── */
function Top10() {
  const [flt, setFlt] = useState('todos');
  const STATUS_LABEL = {quitado:'Quitado',andamento:'Em andamento',quebra:'Quebra'};
  const STATUS_CLS   = {quitado:'badge-quitado',andamento:'badge-andamento',quebra:'badge-quebra'};
  const list = flt==='todos' ? D.TOP : D.TOP.filter(p=>p.status===flt);

  return (
    <div className="section-card">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div className="section-title" style={{marginBottom:0}}>
          <Ic n="trend" s={14}/> Top 10 — Maiores Processos
        </div>
        <div style={{display:'flex',gap:5}}>
          {['todos','andamento','quitado','quebra'].map(f=>(
            <button key={f} className={'filter-btn'+(flt===f?' active':'')} onClick={()=>setFlt(f)}>
              {f==='todos'?'Todos':STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>
      <div style={{overflowX:'auto'}}>
        <table className="top10-table">
          <thead>
            <tr>
              <th>#</th><th>Processo</th><th>Interessado</th><th>Tipo</th>
              <th style={{textAlign:'right'}}>Total</th>
              <th style={{textAlign:'right'}}>Pago</th>
              <th>Progresso</th>
              <th>Status</th>
              <th>Subpref.</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p,i)=>{
              const pct = p.status==='quebra' ? 0 : p.total>0 ? p.pago/p.total*100 : 0;
              const barColor = p.status==='quebra'?'#f59e0b':pct>=100?'#16a34a':'#3b82f6';
              return (
                <tr key={p.id}>
                  <td><span className="rank-num">{i+1}</span></td>
                  <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{p.num}</td>
                  <td style={{maxWidth:170,overflow:'hidden',textOverflow:'ellipsis'}}>{p.int}</td>
                  <td><span className={'proc-badge '+(p.tipo==='PDE'?'badge-pde':'badge-cota')}>{p.tipo}</span></td>
                  <td style={{textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{fmtM(p.total)}</td>
                  <td style={{textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:p.status==='quebra'?'#dc2626':undefined}}>
                    {p.status==='quebra'?'—':fmtM(p.pago)}
                  </td>
                  <td>
                    <div className="prog-bar-wrap">
                      <div className="prog-bar">
                        <div style={{height:'100%',width:pct+'%',background:barColor,borderRadius:9999,transition:'width 0.4s'}}/>
                      </div>
                      <span style={{fontSize:10,color:'var(--muted-foreground)',minWidth:30}}>{fmtPct(pct,0)}</span>
                    </div>
                  </td>
                  <td><span className={'proc-badge '+(STATUS_CLS[p.status]||'')}>{STATUS_LABEL[p.status]}</span></td>
                  <td style={{fontSize:11,color:'var(--muted-foreground)'}}>{p.sub}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Subprefeituras Ranking ── */
function SubRanking() {
  const max = D.SUBS[0].val;
  return (
    <div className="chart-card">
      <div className="chart-title"><Ic n="map" s={13}/> Por Subprefeitura</div>
      <div className="sub-grid">
        {D.SUBS.map(s=>(
          <div key={s.nome} className="sub-row">
            <span style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.nome}</span>
            <div className="sub-bar">
              <div className="sub-bar-fill" style={{width:(s.val/max*100)+'%'}}/>
            </div>
            <span className="sub-val">{fmtM(s.val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PDE vs COTA ── */
function PdeCota() {
  const pdeProc  = D.TOP.filter(p=>p.tipo==='PDE');
  const cotaProc = D.TOP.filter(p=>p.tipo==='COTA');
  const totalPde = pdeProc.reduce((a,p)=>a+p.total,0);
  const totalCota= cotaProc.reduce((a,p)=>a+p.total,0);
  const total    = totalPde + totalCota;

  const tipos = [
    {label:'PDE', total:totalPde, pct:totalPde/total*100, count:pdeProc.length, color:'#1e3a7a'},
    {label:'COTA',total:totalCota,pct:totalCota/total*100,count:cotaProc.length,color:'#c2410c'},
  ];
  const statuses = ['quitado','andamento','quebra'];
  const SLBL = {quitado:'Quitados',andamento:'Em andamento',quebra:'Quebras'};

  return (
    <div className="chart-card">
      <div className="chart-title"><Ic n="pie" s={13}/> PDE vs COTA</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        {tipos.map(t=>(
          <div key={t.label} style={{textAlign:'center',border:'1px solid var(--border)',borderRadius:8,padding:'12px 8px'}}>
            <div style={{fontSize:11,fontWeight:700,color:t.color,letterSpacing:'0.06em',marginBottom:4}}>{t.label}</div>
            <div style={{fontSize:17,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmtM(t.total)}</div>
            <div style={{fontSize:11,color:'var(--muted-foreground)',marginTop:2}}>{fmtPct(t.pct)} · {t.count} proc.</div>
            <div style={{height:3,background:'var(--border)',borderRadius:999,margin:'8px 0 0',overflow:'hidden'}}>
              <div style={{height:'100%',background:t.color,width:t.pct+'%',borderRadius:999}}/>
            </div>
          </div>
        ))}
      </div>
      {statuses.map(st=>{
        const pdeN = pdeProc.filter(p=>p.status===st).length;
        const cotaN= cotaProc.filter(p=>p.status===st).length;
        return (
          <div key={st} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderTop:'1px solid var(--border)'}}>
            <span style={{color:'var(--muted-foreground)'}}>{SLBL[st]}</span>
            <span>
              <b style={{color:'#1e3a7a'}}>{pdeN}</b> PDE
              <span style={{color:'var(--border)',margin:'0 4px'}}>·</span>
              <b style={{color:'#c2410c'}}>{cotaN}</b> COTA
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Projeção de Fechamento ── */
function Forecast() {
  const d = D.D26;
  const collected = d.real.filter(Boolean).reduce((a,b)=>a+b,0);
  const remPrev   = d.prev.slice(MES_ATUAL+1).reduce((a,b)=>a+b,0);
  const scenarios = [
    {label:'Conservador',mult:0.92,color:'#dc2626'},
    {label:'Central',    mult:0.97,color:'#d97706'},
    {label:'Otimista',   mult:1.02,color:'#16a34a'},
  ];
  return (
    <div className="chart-card">
      <div className="chart-title"><Ic n="target" s={13}/> Projeção de Fechamento — 2026</div>
      <div style={{fontSize:12,color:'var(--muted-foreground)',marginBottom:12,lineHeight:1.5}}>
        Coletado <b style={{color:'var(--foreground)'}}>Jan–Jun:</b> {fmtM(collected,0)} &nbsp;·&nbsp;
        Previsto restante <b style={{color:'var(--foreground)'}}>Jul–Dez:</b> {fmtM(remPrev,0)} &nbsp;·&nbsp;
        Meta: <b style={{color:'var(--foreground)'}}>R$ 1.200M</b>
      </div>
      <div className="forecast-grid">
        {scenarios.map(sc=>{
          const year = +(collected + remPrev*sc.mult).toFixed(0);
          const gap  = year - D.META_ANUAL;
          const pct  = year / D.META_ANUAL * 100;
          return (
            <div key={sc.label} className="fc-item">
              <div className="fc-val" style={{color:sc.color}}>{fmtM(year,0)}</div>
              <div className="fc-lbl">{sc.label}</div>
              <div style={{height:3,background:'#e2e8f0',borderRadius:999,margin:'8px 0 4px',overflow:'hidden'}}>
                <div style={{height:'100%',background:sc.color,width:Math.min(pct,100)+'%',borderRadius:999}}/>
              </div>
              <div style={{fontSize:10,color:sc.color,fontWeight:600}}>
                {fmtPct(pct,1)} {gap>=0?`(+${gap.toFixed(0)}M)`:`(${gap.toFixed(0)}M)`}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:12,padding:'8px 12px',borderRadius:6,background:'var(--muted)',fontSize:11,color:'var(--muted-foreground)'}}>
        ⚠ Projeções consideram taxa de quebras histórica de ~3% e sazonalidade de pagamentos de parcelas.
        Antecipações extraordinárias podem melhorar o cenário central.
      </div>
    </div>
  );
}

/* ── Vencimentos Próximos ── */
function Alertas() {
  const urgCls = d => d<=7?'urgente':d<=14?'proximo':'ok';
  return (
    <div className="chart-card">
      <div className="chart-title"><Ic n="bell" s={13}/> Vencimentos Próximos — 30 dias</div>
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        {D.ALERTAS.map((a,i)=>(
          <div key={i} className="alert-row">
            <div className={'alert-dias '+urgCls(a.dias)}>
              <div style={{fontSize:14,lineHeight:1}}>{a.dias}</div>
              <div style={{fontSize:9,marginTop:1}}>dias</div>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.num}</div>
              <div style={{fontSize:11,color:'var(--muted-foreground)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.int}</div>
            </div>
            <span className={'proc-badge '+(a.tipo==='PDE'?'badge-pde':'badge-cota')}>{a.tipo}</span>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:700}}>{fmtM(a.val)}</div>
              <div style={{fontSize:10,color:'var(--muted-foreground)'}}>{a.venc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Comparativo Anual ── */
function ComparativoAnual() {
  function makeData() {
    const anos = [2022,2023,2024,2025];
    const totals2026Parcial = D.D26.real.filter(Boolean).reduce((a,b)=>a+b,0);
    const colors = ['rgba(148,163,184,0.5)','rgba(100,130,185,0.6)','rgba(60,100,175,0.7)','rgba(30,60,140,0.75)'];
    const datasets = anos.map((ano,i)=>({
      label: String(ano),
      data: D.HIST[ano],
      backgroundColor: colors[i],
      borderColor: colors[i].replace(/[^,]+\)$/,'1)'),
      borderWidth:1, borderRadius:3,
    }));
    datasets.push({
      label:'2026 (parcial)',
      data: D.D26.real,
      backgroundColor:'rgba(59,130,246,0.85)',
      borderColor:'rgba(59,130,246,1)',
      borderWidth:1, borderRadius:3,
    });
    return {
      data:{ labels:D.MESES, datasets },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{position:'bottom',labels:{boxWidth:10,padding:12,font:{size:10}}},
          tooltip:{callbacks:{label:ctx=>' '+ctx.dataset.label+': '+fmtM(ctx.raw)}},
        },
        scales:{
          y:{min:50,ticks:{callback:v=>'R$'+v+'M',font:{size:10}},grid:{color:'rgba(0,0,0,0.04)'}},
          x:{ticks:{font:{size:10}},grid:{display:false}},
        },
      },
    };
  }
  return (
    <div className="section-card">
      <div className="section-title"><Ic n="bar" s={14}/> Comparativo Ano a Ano (2022–2026)</div>
      <ChartBox type="bar" makeData={makeData} height={240}/>
    </div>
  );
}

/* ── Main App ── */
function App() {
  const [tipo,  setTipo]  = useState('todos');
  const [status,setStatus]= useState('todos');
  const [sub,   setSub]   = useState('todas');

  return (
    <div className="app">
      <Sidebar/>
      <main className="rel-main">
        <div className="rel-wrap">

          {/* Header */}
          <div className="rel-header">
            <div>
              <h1>Relatórios de Arrecadação</h1>
              <p>Outorga Onerosa do Direito de Construir — São Paulo · Ano 2026</p>
            </div>
            <button className="btn" onClick={()=>window.print()}>
              <Ic n="down" s={13}/> Exportar PDF
            </button>
          </div>

          {/* Filters */}
          <div className="rel-filters">
            <span className="filter-label">Tipo</span>
            <select className="filter-select" value={tipo} onChange={e=>setTipo(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="PDE">PDE</option>
              <option value="COTA">COTA</option>
            </select>
            <div className="filter-sep"/>
            <span className="filter-label">Status</span>
            <select className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="quitado">Quitado</option>
              <option value="andamento">Em andamento</option>
              <option value="quebra">Quebra</option>
            </select>
            <div className="filter-sep"/>
            <span className="filter-label">Subprefeitura</span>
            <select className="filter-select" value={sub} onChange={e=>setSub(e.target.value)}>
              <option value="todas">Todas</option>
              {D.SUBS.map(s=><option key={s.nome} value={s.nome}>{s.nome}</option>)}
            </select>
            <div className="filter-sep"/>
            <span className="filter-label">Período</span>
            <select className="filter-select" defaultValue="2026">
              {[2022,2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
            </select>
          </div>

          {/* KPIs */}
          <KpiSection/>

          {/* Calendário */}
          <CalendarSection/>

          {/* Bar + Line */}
          <div className="charts-2col">
            <BarChartSection/>
            <LineChartSection/>
          </div>

          {/* Donut + Heatmap */}
          <div className="charts-2col" style={{gridTemplateColumns:'1fr 2fr'}}>
            <DonutSection/>
            <Heatmap/>
          </div>

          {/* Comparativo anual */}
          <ComparativoAnual/>

          {/* Top 10 */}
          <Top10/>

          {/* Sub ranking + PDE vs COTA */}
          <div className="charts-2col">
            <SubRanking/>
            <PdeCota/>
          </div>

          {/* Forecast + Alertas */}
          <div className="charts-2col">
            <Forecast/>
            <Alertas/>
          </div>

        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
