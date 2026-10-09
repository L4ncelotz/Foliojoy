import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { ArrowDownToLine, ArrowRight, ChartNoAxesCombined, Check, CheckCircle2, ChevronDown, CircleAlert, Eye, EyeOff, FileSpreadsheet, FileUp, LayoutDashboard, LogOut, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, Wallet } from 'lucide-react'
import { api, emptyRow, refreshSession, setCsrf, type Dashboard, type Portfolio, type Preview, type RawRow, type Session } from './api'

const currency = (value: string | null) => value === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
const percent = (value: string) => `${Number(value).toFixed(2)}%`
const currentDate = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }

function Login({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  function validate(nextEmail = email, nextPassword = password, nextMode = mode) {
    const next: { email?: string; password?: string } = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail.trim())) next.email = 'Enter a valid email address'
    if (!nextPassword) next.password = 'Password is required'
    else if (nextMode === 'register' && nextPassword.length < 12) next.password = 'Password must be at least 12 characters'
    else if (nextPassword.length > 128) next.password = 'Password must be at most 128 characters'
    return next
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    const next = validate()
    setFieldErrors(next)
    if (Object.keys(next).length) { setBusy(false); return }
    try {
      await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) })
      const session = await refreshSession()
      if (!session) throw new Error('Session could not be started')
      onAuthenticated(session)
    } catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }
  return <div className="auth-layout">
    <div className="auth-side">
      <div className="brand"><div className="brand-mark"><ChartNoAxesCombined size={20}/></div><span>foliojoy<span className="brand-dot">.</span></span></div>
      <div className="auth-lead"><p className="eyebrow">PORTFOLIO INTELLIGENCE</p><h1>Your investments, in focus.</h1><p>Track your portfolio, understand your exposure, and make more informed decisions.</p>
        <div className="preview-card" aria-hidden="true"><div className="preview-card-head"><span>Illustrative preview</span><span>Not your data</span></div><div className="preview-card-body"><div className="preview-donut" /><div className="preview-bars"><span style={{width:'72%'}} /><span style={{width:'48%'}} /><span style={{width:'31%'}} /><span style={{width:'18%'}} /></div></div></div>
      </div>
      <div className="auth-foot"><ShieldCheck size={18} /> Your investment data stays private to your account.</div>
    </div>
    <main className="auth-form-wrap"><form className="auth-form" onSubmit={submit} noValidate>
      <div className="icon-tile"><Wallet size={22}/></div>
      <h2>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
      <p className="muted">{mode === 'register' ? 'Start with a portfolio snapshot in minutes.' : 'Sign in to your portfolio.'}</p>
      <label className="field-label">Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, email: validate(email, password, mode).email }))} aria-invalid={!!fieldErrors.email}/>{fieldErrors.email && <span className="field-error" role="alert">{fieldErrors.email}</span>}</label>
      <label className="field-label">Password<span className="password-wrap"><input required maxLength={128} minLength={mode === 'register' ? 12 : undefined} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'At least 12 characters' : 'Enter your password'} value={password} onChange={e => setPassword(e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, password: validate(email, password, mode).password }))} aria-invalid={!!fieldErrors.password}/><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span>{fieldErrors.password && <span className="field-error" role="alert">{fieldErrors.password}</span>}</label>
      {error && <div className="alert danger"><CircleAlert size={17}/>{error}</div>}
      <button disabled={busy} className="button primary wide" type="submit">{busy ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Sign in'} <ArrowRight size={16}/></button>
      <p className="switch">{mode === 'register' ? 'Already registered?' : 'New to Foliojoy?'} <button type="button" className="link-button" onClick={() => {setMode(mode === 'register' ? 'login' : 'register'); setError(''); setFieldErrors({})}}>{mode === 'register' ? 'Sign in' : 'Create account'}</button></p>
      <p className="auth-note">Local development preview · Not ready for public financial data yet.</p>
    </form></main>
  </div>
}

function ImportStudio({ portfolio, onCommitted }: { portfolio: Portfolio; onCommitted: () => void }) {
  const [date, setDate] = useState(currentDate())
  const [rows, setRows] = useState<RawRow[]>([emptyRow(currentDate())])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const changeRow = (index: number, field: keyof RawRow, value: string) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row)); setPreview(null)
  }
  const changeDate = (value: string) => { setDate(value); setRows(prev => prev.map(row => ({ ...row, snapshot_date: value }))); setPreview(null) }
  async function previewRows(candidate: RawRow[] = rows) {
    setWorking(true); setError('')
    try {
      const result = await api<Preview>(`/portfolios/${portfolio.id}/imports/preview`, { method: 'POST', body: JSON.stringify({ rows: candidate }) })
      setPreview(result); setRows(result.rows.map(row => ({ symbol: row.symbol, exchange: row.exchange, quantity: row.quantity, unit_price: row.unit_price, market_value: row.market_value, currency: row.currency, snapshot_date: row.snapshot_date })))
    } catch (err) {setPreview(null); setError((err as Error).message)}
    finally {setWorking(false)}
  }
  async function loadFile(file?: File) {
    if (!file) return
    setWorking(true); setError(''); setFileName(file.name)
    if (file.size > 256000 || !file.name.toLowerCase().endsWith('.csv')) {
      setError('This first slice supports CSV files up to 256 KB. Image, PDF and Excel import are scheduled for Phase 2.'); setWorking(false); return
    }
    try {
      const result = await api<Preview>(`/portfolios/${portfolio.id}/imports/preview`, { method: 'POST', body: JSON.stringify({ csv_text: await file.text() }) })
      setPreview(result)
      setRows(result.rows.map(row => ({symbol:row.symbol, exchange:row.exchange,quantity:row.quantity,unit_price:row.unit_price,market_value:row.market_value,currency:row.currency,snapshot_date:row.snapshot_date})))
      if (result.rows.length && result.rows[0].snapshot_date) setDate(result.rows[0].snapshot_date)
    } catch (err) {setPreview(null); setError((err as Error).message)}
    finally {setWorking(false); if (inputRef.current) inputRef.current.value = ''}
  }
  async function save() {
    if (!preview?.valid) return
    setWorking(true); setError('')
    try {
      await api(`/portfolios/${portfolio.id}/snapshots`, {method:'POST',body:JSON.stringify({rows})})
      onCommitted()
    } catch(err) {setError((err as Error).message);setPreview(null)}
    finally {setWorking(false)}
  }
  return <div className="studio stack">
    <div className="split-heading"><div><p className="eyebrow">PORTFOLIO IMPORT</p><h2>Add your holdings</h2><p className="muted">Enter a snapshot of what you currently own. No purchase history is inferred.</p></div></div>
    <div className="import-methods">
      <button className="method-card" onClick={() => inputRef.current?.click()}><FileUp size={23}/><strong>Import CSV</strong><span>Upload a structured snapshot</span></button>
      <a className="method-card" download href="/api/templates/holdings.csv"><ArrowDownToLine size={23}/><strong>CSV template</strong><span>Download a sample to edit</span></a>
      <button className="method-card" onClick={() => {setRows([emptyRow(date)]);setPreview(null);setFileName('')}}><FileSpreadsheet size={23}/><strong>Manual entry</strong><span>Enter or correct holdings</span></button>
      <input hidden type="file" accept=".csv,text/csv" ref={inputRef} onChange={e => loadFile(e.target.files?.[0])}/>
    </div>
    <div className="surface editor-card">
      <div className="editor-header"><div><h3>Holdings snapshot</h3><span>{fileName ? `Imported from ${fileName}` : 'Manual entries'} · USD only</span></div><label className="date-input">As of <input type="date" max={currentDate()} value={date} onChange={e=>changeDate(e.target.value)}/></label></div>
      <div className="table-scroll"><table className="edit-table"><thead><tr><th>Symbol</th><th>Exchange</th><th>Quantity</th><th>Unit price ($)</th><th>Market value ($)</th><th></th></tr></thead><tbody>{rows.map((row,i)=><tr key={i} className={preview?.rows[i]?.status==='invalid'?'invalid-row':''}>
        {(['symbol','exchange','quantity','unit_price','market_value'] as const).map(field=><td key={field}><input aria-label={`Row ${i+1} ${field}`} className="cell-input" type={field==='symbol'||field==='exchange'?'text':'number'} min={field==='quantity'||field==='unit_price'||field==='market_value'?'0':undefined} step="any" placeholder={field==='unit_price'||field==='market_value'?'optional':'required'} value={row[field]} onChange={e=>changeRow(i,field,e.target.value)}/></td>)}
        <td><button type="button" className="icon-button" title="Remove row" disabled={rows.length===1} onClick={()=>{setRows(prev=>prev.filter((_,j)=>j!==i));setPreview(null)}}><Trash2 size={16}/></button></td>
      </tr>)}</tbody></table></div>
      {preview?.rows.some(row=>row.errors.length>0) && <div className="validation-list">{preview.rows.filter(row=>row.errors.length).map(row=><div key={row.row}><CircleAlert size={16}/> <span>Row {row.row}: {row.errors.join('; ')}</span></div>)}</div>}
      <div className="editor-footer"><button className="button secondary" onClick={()=>{setRows(prev=>[...prev,emptyRow(date)]);setPreview(null)}} disabled={rows.length>=200}><Plus size={16}/> Add row</button><div className="footer-actions">{preview?.valid&&<span className="verified"><CheckCircle2 size={16}/> All {preview.rows.length} rows valid</span>}<button className="button secondary" disabled={working} onClick={()=>previewRows()}><RefreshCw size={15}/> {working?'Checking...':'Validate'}</button><button className="button primary" disabled={!preview?.valid||working} onClick={save}><Check size={16}/> Confirm & save</button></div></div>
    </div>
    {error&&<div className="alert danger"><CircleAlert size={18}/>{error}</div>}
    <div className="info-line"><ShieldCheck size={17}/> The final portfolio is saved only after your confirmation. Cost basis and performance require transaction history.</div>
  </div>
}

function AllocationChart({ positions }: { positions: Dashboard['positions'] }) {
  const data=positions.map(row=>({name:row.symbol,value:Number(row.market_value)}))
  const option=useMemo(()=>({backgroundColor:'transparent',tooltip:{trigger:'item',formatter:(p:{name:string;percent:number;value:number})=>`${p.name}: ${currency(String(p.value))} (${p.percent.toFixed(1)}%)`},legend:{show:false},color:['#638af7','#39b8a1','#e3b66f','#b491e9','#e77c89','#6ab0c4','#aab6c9'],series:[{type:'pie',radius:['68%','86%'],center:['50%','50%'],startAngle:90,avoidLabelOverlap:true,padAngle:3,itemStyle:{borderRadius:6},label:{show:false},labelLine:{show:false},data}]}),[positions])
  return <ReactECharts option={option} notMerge style={{width:'100%',height:255}}/>
}

function DashboardView({ portfolio, onImport }: { portfolio: Portfolio; onImport: ()=>void }) {
  const {data, isLoading, error}=useQuery({queryKey:['dashboard',portfolio.id],queryFn:()=>api<Dashboard>(`/portfolios/${portfolio.id}/dashboard`)})
  if(isLoading)return <div className="empty-state">Loading dashboard...</div>
  if(error)return <div className="alert danger">{(error as Error).message}</div>
  if(!data?.snapshot)return <div className="surface onboarding"><p className="eyebrow">PORTFOLIO SETUP</p><h2>Add your first snapshot</h2><p className="muted">This portfolio has no holdings yet. Add a snapshot to see allocation. No purchase history is inferred.</p><ol className="onboarding-steps"><li className="done"><span className="step-dot"><Check size={14}/></span><div><strong>Portfolio created</strong><span>{portfolio.name} is ready</span></div></li><li className="current"><span className="step-dot">2</span><div><strong>Add holdings</strong><span>CSV upload or manual entry, USD only</span></div></li><li><span className="step-dot">3</span><div><strong>Review allocation</strong><span>Totals appear after you confirm</span></div></li></ol><div className="onboarding-actions"><button className="button primary" onClick={onImport}><Plus size={17}/> Add holdings</button></div></div>
  const largest = data.positions[0]
  return <div className="stack">
    <div className="split-heading"><div><p className="eyebrow">PORTFOLIO OVERVIEW</p><h2>{portfolio.name}</h2><p className="muted">Snapshot as of {data.snapshot.as_of} · USD valuations provided by you</p></div><button className="button secondary" onClick={onImport}><Plus size={16}/> Update snapshot</button></div>
    <div className="stat-grid">
      <div className="surface stat-card"><span>Portfolio market value</span><strong>{currency(data.total_value)}</strong><small>Based on confirmed imported values</small></div>
      <div className="surface stat-card"><span>Holdings</span><strong>{data.positions.length}</strong><small>Unique symbol + exchange pairs</small></div>
      <div className="surface stat-card"><span>Largest position</span><strong>{largest?.symbol||'—'}</strong><small>{largest ? `${percent(largest.weight_pct)} of portfolio` : 'No holdings'}</small></div>
    </div>
    <div className="visual-grid">
      <div className="surface panel"><div className="panel-header"><div><h3>Allocation</h3><p>Market value by holding</p></div><span className="panel-tag">USD</span></div><div className="chart-wrap"><AllocationChart positions={data.positions}/><div className="chart-center"><span>Total value</span><strong>{currency(data.total_value)}</strong></div></div><div className="legend">{data.positions.slice(0,5).map((p,i)=><div key={p.symbol+'-'+p.exchange}><span className={`legend-dot dot-${i}`}/><span>{p.symbol}</span><strong>{percent(p.weight_pct)}</strong></div>)}</div></div>
      <div className="surface panel"><div className="panel-header"><div><h3>Exposure breakdown</h3><p>Where your capital is concentrated</p></div></div><div className="exposure-list">{data.positions.slice(0,8).map((p,i)=><div className="exposure-row" key={p.symbol+'-'+p.exchange}><div className="exposure-heading"><span><span className="ticker-tag">{p.symbol.slice(0,4)}</span> {p.symbol}</span><strong>{percent(p.weight_pct)}</strong></div><div className="meter"><div className={`meter-fill dot-${i%5}`} style={{width:`${Math.max(0,Math.min(100,Number(p.weight_pct)))}%`}}/></div></div>)}</div></div>
    </div>
    <div className="surface panel"><div className="panel-header"><div><h3>Holdings</h3><p>Snapshot positions · values are not live quotes</p></div><span className="panel-tag">{data.positions.length} assets</span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Security</th><th>Quantity</th><th>Unit price</th><th>Market value</th><th>Weight</th></tr></thead><tbody>{data.positions.map(p=><tr key={p.symbol+'-'+p.exchange}><td><strong>{p.symbol}</strong><small>{p.exchange}</small></td><td>{Number(p.quantity).toLocaleString('en-US')}</td><td>{currency(p.unit_price)}</td><td>{currency(p.market_value)}</td><td><span className="weight-label">{percent(p.weight_pct)}</span></td></tr>)}</tbody></table></div></div>
    <div className="notice"><Sparkles size={19}/><div><strong>Financial metrics not available yet</strong><p>P&L, cost basis, return history and AI guidance need verified transactions, quotes or thesis context. We won't manufacture these numbers.</p></div></div>
  </div>
}

export default function App() {
  const queryClient=useQueryClient()
  const [session,setSession]=useState<Session|null>(null)
  const [loadingSession,setLoadingSession]=useState(true)
  const [selected,setSelected]=useState<number|null>(null)
  const [creating,setCreating]=useState(false)
  const [name,setName]=useState('My Portfolio')
  const [screen,setScreen]=useState<'dashboard'|'import'>('dashboard')
  const [error,setError]=useState('')
  useEffect(()=>{refreshSession().then(s=>{setSession(s);setLoadingSession(false)})},[])
  const {data:portfolios=[]}=useQuery({queryKey:['portfolios',session?.user.id],queryFn:()=>api<Portfolio[]>('/portfolios'),enabled:!!session})
  useEffect(()=>{if(portfolios.length && (selected===null || !portfolios.some(p=>p.id===selected))) setSelected(portfolios[0].id)},[portfolios,selected])
  const portfolio=portfolios.find(p=>p.id===selected)
  async function createPortfolio(e:FormEvent) {
    e.preventDefault();setError('')
    try {const record=await api<Portfolio>('/portfolios',{method:'POST',body:JSON.stringify({name,base_currency:'USD'})});await queryClient.invalidateQueries({queryKey:['portfolios']});setSelected(record.id);setCreating(false);setScreen('import')}
    catch(err){setError((err as Error).message)}
  }
  async function logout(){try{await api('/auth/logout',{method:'POST'})}finally{setCsrf('');setSession(null);queryClient.clear();setSelected(null)}}
  if(loadingSession)return <div className="loading-view">Opening your portfolio...</div>
  if(!session)return <Login onAuthenticated={s=>setSession(s)}/>
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><ChartNoAxesCombined size={19}/></div><span>foliojoy<span className="brand-dot">.</span></span></div><div className="nav-title">PORTFOLIO</div>
      <button className={`nav-item ${screen==='dashboard'?'active':''}`} onClick={()=>setScreen('dashboard')}><LayoutDashboard size={18}/> Overview</button>
      <button className={`nav-item ${screen==='import'?'active':''}`} onClick={()=>setScreen('import')}><FileUp size={18}/> Import holdings</button>
      <div className="sidebar-space"/><div className="sidebar-note-compact" title="All data is scoped to your account"><ShieldCheck size={15}/><span>Private to your account</span></div><button className="nav-item logout" onClick={logout}><LogOut size={17}/> Sign out</button>
    </aside>
    <div className="main-area"><header className="topbar"><div className="mobile-brand">foliojoy<span>.</span></div><div className="portfolio-picker">{portfolio ? <><Wallet size={17}/><select aria-label="Portfolio" value={selected??''} onChange={e=>{setSelected(Number(e.target.value));setScreen('dashboard')}}>{portfolios.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><ChevronDown size={15}/></> : <span>Select a portfolio</span>}</div><div className="topbar-actions"><button className="button ghost" onClick={()=>setCreating(true)}><Plus size={17}/> <span>New portfolio</span></button><div className="user-circle" title={session.user.email}>{session.user.email.slice(0,1).toUpperCase()}</div></div></header>
      <div className="mobile-nav"><button className={screen==='dashboard'?'selected':''} onClick={()=>setScreen('dashboard')}><LayoutDashboard size={16}/> Overview</button><button className={screen==='import'?'selected':''} onClick={()=>setScreen('import')}><FileUp size={16}/> Import</button></div>
      <main className="content">
        {portfolio ? screen==='dashboard' ? <DashboardView portfolio={portfolio} onImport={()=>setScreen('import')}/> : <ImportStudio key={portfolio.id} portfolio={portfolio} onCommitted={()=>{queryClient.invalidateQueries({queryKey:['dashboard',portfolio.id]});setScreen('dashboard')}}/> : screen==='import' ? <div className="empty-state"><div className="empty-icon"><FileUp size={25}/></div><h2>Select a portfolio first</h2><p>Import needs a portfolio to attach the snapshot to. Create or select one to continue.</p><button className="button primary" onClick={()=>setCreating(true)}>Create portfolio <ArrowRight size={16}/></button></div> : <div className="empty-state"><div className="empty-icon"><Wallet size={25}/></div><h2>Create a portfolio to get started</h2><p>Portfolios hold your snapshots. Create one, then add holdings manually or upload a CSV snapshot.</p><button className="button primary" onClick={()=>setCreating(true)}>Create portfolio <ArrowRight size={16}/></button></div>}
      </main>
      <footer className="app-footer"><span>Foliojoy</span><span>Educational portfolio visualization · No investment advice</span></footer>
    </div>
    {creating&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCreating(false)}}><form className="modal" onSubmit={createPortfolio}><div className="icon-tile"><Wallet size={20}/></div><h2>Create portfolio</h2><p className="muted">Your positions will be stored privately in this portfolio.</p><label className="field-label">Portfolio name<input required minLength={1} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><p className="info-line">Base currency: USD (initial MVP)</p>{error&&<div className="alert danger">{error}</div>}<div className="modal-actions"><button className="button secondary" type="button" onClick={()=>setCreating(false)}>Cancel</button><button className="button primary" type="submit">Create <ArrowRight size={16}/></button></div></form></div>}
  </div>
}
