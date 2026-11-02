import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft, ArrowRight, Bell, Check, ChevronDown, Coffee, Film, HeartPulse,
  LayoutDashboard, Menu, MoreHorizontal, Plus, Receipt, ShoppingBag, SlidersHorizontal,
  TrainFront, TrendingUp, Trash2, Wallet,
  X, Zap,
} from 'lucide-react'

const CATEGORIES = [
  { name: 'Food', icon: Coffee, color: 'peach' },
  { name: 'Transportation', icon: TrainFront, color: 'blue' },
  { name: 'Entertainment', icon: Film, color: 'lavender' },
  { name: 'Utilities', icon: Zap, color: 'yellow' },
  { name: 'Shopping', icon: ShoppingBag, color: 'pink' },
  { name: 'Healthcare', icon: HeartPulse, color: 'mint' },
  { name: 'Other', icon: Receipt, color: 'gray' },
]

const API_URL = import.meta.env.VITE_API_URL || ''
const getClientId = () => {
  let id = localStorage.getItem('expense-tracker-client-id')
  if (!id) {
    id = crypto.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem('expense-tracker-client-id', id)
  }
  return id
}
const CLIENT_ID = getClientId()
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0)

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}/api/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Client-ID': CLIENT_ID, ...options.headers },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`)
  return result
}

function CategoryBadge({ category }) {
  const config = CATEGORIES.find((item) => item.name === category) || CATEGORIES.at(-1)
  const Icon = config.icon
  return <span className={`category-icon ${config.color}`}><Icon size={17} strokeWidth={1.8} /></span>
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </section>
    </div>
  )
}

function App() {
  const [expenses, setExpenses] = useState([])
  const [budget, setBudget] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState('')
  const [saving, setSaving] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  const refresh = useCallback(async () => {
    setError('')
    try {
      const data = await request('summary')
      setExpenses(data.expenses || [])
      setBudget(Number(data.budget) || 0)
    } catch (err) {
      setError(`We couldn’t load your expenses. ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const total = useMemo(() => expenses.reduce((sum, expense) => sum + (Number(expense[1]) || 0), 0), [expenses])
  const remaining = budget - total
  const percent = budget > 0 ? Math.min(total / budget * 100, 100) : 0
  const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())

  async function addExpense(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const amount = Number(data.get('amount'))
    const category = data.get('category')
    if (!Number.isFinite(amount) || amount <= 0 || !category) return
    setSaving(true)
    try {
      await request('add_expense', { method: 'POST', body: JSON.stringify({ amount, category }) })
      form.reset()
      setModal('')
      setToast('Expense added to your activity.')
      await refresh()
    } catch (err) {
      setToast(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveBudget(event) {
    event.preventDefault()
    const amount = Number(new FormData(event.currentTarget).get('budget'))
    if (!Number.isFinite(amount) || amount <= 0) return
    setSaving(true)
    try {
      await request('set_budget', { method: 'POST', body: JSON.stringify({ budget: amount }) })
      setModal('')
      setToast('Your monthly budget is updated.')
      await refresh()
    } catch (err) {
      setToast(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function resetBudget() {
    if (!window.confirm('Reset your monthly budget? This cannot be undone.')) return
    try {
      await request('reset_budget', { method: 'POST', body: '{}' })
      setToast('Your monthly budget has been reset.')
      await refresh()
    } catch (err) {
      setToast(err.message)
    }
  }
  
  async function clearExpenses() {
    if (!expenses.length || !window.confirm('Clear all of your recorded expenses? This cannot be undone.')) return
    try {
      await request('reset', { method: 'POST', body: '{}' })
      setToast('Your expenses have been cleared.')
      await refresh()
    } catch (err) {
      setToast(err.message)
    }
  }

  async function deleteExpense(expenseId) {
    if (!window.confirm('Delete this expense?')) return
    try {
      await request(`expenses/${expenseId}`, { method: 'DELETE' })
      setToast('Expense deleted.')
      await refresh()
    } catch (err) {
      setToast(err.message)
    }
  }

  const closeModal = useCallback(() => setModal(''), [])
  const nav = <><div className="nav-label">WORKSPACE</div><a className="nav-link selected" href="#overview" onClick={() => setMobileNav(false)}><LayoutDashboard size={18} /><span>Overview</span></a><a className="nav-link" href="#transactions" onClick={() => setMobileNav(false)}><Receipt size={18} /><span>Transactions</span><span className="nav-count">{expenses.length}</span></a><a className="nav-link" href="#budget" onClick={() => setMobileNav(false)}><TrendingUp size={18} /><span>Budget</span></a></>

  return (
    <div className="app-shell" id="overview">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview"><span className="brand-icon"><TrendingUp size={19} strokeWidth={2.2} /></span><span>ExTrack</span></a>
        <nav>{nav}</nav>
        <div className="sidebar-bottom">
        </div>
      </aside>
      {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="main-content">
        <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu"><Menu size={19} /></button><div className="breadcrumb"><b>Overview</b></div></div><div className="topbar-right"><span className="today-label">{dateLabel}</span></div></header>

        <section className="welcome-row"><div><div className="overline"><span className="overline-dot" /> YOUR MONEY, IN GOOD COMPANY</div><h1>Your overview</h1><p className="welcome-copy">A little clarity can make a big difference.</p></div><button className="button button-primary" onClick={() => setModal('expense')}><Plus size={17} /> Add expense</button></section>

        {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={refresh}>Try again</button></div>}

        <section className="summary-grid" aria-label="Spending summary">
          <article className="summary-card"><div className="card-topline"><span className="summary-label">Total spent</span><span className="summary-icon green"><Wallet size={17} /></span></div><div className="summary-number">{loading ? <span className="skeleton" /> : money(total)}</div><div className="summary-foot"><span className="foot-dot green-dot" />Across all recorded expenses</div><div className="card-accent accent-green" /></article>
          <article className="summary-card"><div className="card-topline"><span className="summary-label">Monthly budget</span><span className="summary-icon lilac"><SlidersHorizontal size={16} /></span></div><div className="summary-number">{loading ? <span className="skeleton" /> : money(budget)}</div><div className="summary-foot"><span className="foot-dot lilac-dot" />Your spending plan</div><button className="card-edit" onClick={() => setModal('budget')} aria-label="Edit budget"><MoreHorizontal size={18} /></button><div className="card-accent accent-lilac" /></article>
          <article className="summary-card remaining-card"><div className="card-topline"><span className="summary-label">Left to spend</span><span className="summary-icon peach"><ArrowDownLeft size={17} /></span></div><div className={`summary-number ${remaining < 0 ? 'over-budget' : ''}`}>{loading ? <span className="skeleton" /> : money(remaining)}</div><div className="remaining-progress"><div className="progress-meta"><span>{budget ? `${Math.round(percent)}% of budget used` : 'Set a budget to start'}</span><span>{money(budget)}</span></div><div className="progress-track"><div className={`progress-fill ${remaining < 0 ? 'fill-red' : ''}`} style={{ width: `${budget ? percent : 0}%` }} /></div></div></article>
        </section>

        <section className="dashboard-grid">
          <article className="panel transactions-panel" id="transactions"><div className="panel-heading"><div><div className="panel-kicker">YOUR ACTIVITY</div><h2>Recent transactions</h2><p>All your spending, in one place.</p></div><div className="panel-actions"><button className="filter-button" aria-label="Filter transactions"><SlidersHorizontal size={15} /><span>Filter</span><ChevronDown size={13} /></button><button className="more-button" onClick={clearExpenses} title="Clear expenses" aria-label="Clear all expenses"><MoreHorizontal size={19} /></button></div></div>
            <div className="transaction-table"><div className="table-heading"><span>TRANSACTION</span><span>CATEGORY</span><span>AMOUNT</span></div>
              {loading ? <div className="table-loading"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div> : expenses.length ? [...expenses].reverse().map(([id, amount, category], index) => <div className="transaction-row" key={id ?? `${category}-${index}`}><div className="transaction-name"><CategoryBadge category={category} /><span><b>{category}</b><small>Expense</small></span></div><span className="category-text">{category}</span><span className="transaction-amount">− {money(amount)}</span><button className="delete-expense" onClick={() => deleteExpense(id)} aria-label={`Delete ${category} expense`} title="Delete expense"><Trash2 size={15} /></button></div>) : <div className="empty-state"><span className="empty-icon"><Receipt size={21} /></span><b>Nothing to see just yet</b><span>Your expenses will appear here once you add one.</span><button onClick={() => setModal('expense')}><Plus size={15} /> Add your first expense</button></div>}
            </div>
            {expenses.length > 5 && <button className="view-all" onClick={() => document.getElementById('transactions').scrollIntoView({ behavior: 'smooth' })}>You’re all caught up <Check size={14} /></button>}
          </article>

          <div className="right-column">
            <article className="panel budget-panel" id="budget"><div className="budget-panel-head"><span className="budget-icon"><TrendingUp size={17} /></span><button className="more-button" onClick={() => setModal('budget')} aria-label="Edit monthly budget"><MoreHorizontal size={19} /></button></div><div className="panel-kicker">YOUR MONTHLY PLAN</div><h2>Budget tracker</h2><p className="budget-intro">Little check-ins help you stay on track.</p><div className="budget-figure"><span>{money(total)}</span><span className="budget-of">of {money(budget)}</span></div><div className="budget-track"><div className={`budget-fill ${remaining < 0 ? 'fill-red' : ''}`} style={{ width: `${budget ? percent : 0}%` }} /></div><div className="budget-status"><span className={remaining < 0 ? 'status-red' : ''}><i />{budget ? (remaining < 0 ? 'Over your limit' : 'On track') : 'No budget set'}</span><b>{budget ? `${Math.round(percent)}%` : '—'}</b></div><div className="budget-actions"><button className="budget-link" onClick={() => setModal('budget')}>{budget ? 'Adjust monthly budget' : 'Set a monthly budget'} <ArrowRight size={15} /></button><button className="budget-reset" onClick={resetBudget} disabled={!budget} title="Reset monthly budget">Reset budget</button></div></article>

          </div>
        </section>
        <footer className="page-footer"><span>Expense Tracker</span><span>ExTrack</span></footer>
      </main>

      {modal === 'expense' && <Modal title="Add an expense" onClose={closeModal}><p className="modal-description">A quick note helps you keep track of the little things.</p><form className="modal-form" onSubmit={addExpense}><label>Amount<div className="money-input"><span>$</span><input autoFocus name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required /></div></label><label>Category<select name="category" defaultValue="" required><option value="" disabled>Choose a category</option>{CATEGORIES.map(({ name }) => <option key={name} value={name}>{name}</option>)}</select></label><div className="modal-actions"><button type="button" className="button button-quiet" onClick={closeModal}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : <><Plus size={16} /> Save expense</>}</button></div></form></Modal>}
      {modal === 'budget' && <Modal title="Your monthly budget" onClose={closeModal}><p className="modal-description">Choose a comfortable monthly limit for your spending.</p><form className="modal-form" onSubmit={saveBudget}><label>Monthly amount<div className="money-input"><span>$</span><input autoFocus name="budget" type="number" min="0.01" step="0.01" defaultValue={budget || ''} placeholder="0.00" required /></div></label><div className="modal-actions"><button type="button" className="button button-quiet" onClick={closeModal}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : <><Check size={16} /> Save budget</>}</button></div></form></Modal>}
      {toast && <div className="toast" role="status"><span className="toast-check"><Check size={14} /></span>{toast}</div>}
    </div>
  )
}

export default App
