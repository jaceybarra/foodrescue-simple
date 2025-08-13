import React, { useState, useEffect } from 'react'
import Admin from './pages/Admin.jsx'
import Driver from './pages/Driver.jsx'

export default function App() {
  const [tab, setTab] = useState('admin')
  const [counts, setCounts] = useState({ all:0, open:0, claimed:0, active:0 })

  useEffect(()=>{
    fetch('/api/jobs').then(r=>r.json()).then(rows=>{
      const all = rows.length
      const open = rows.filter(r=>r.status==='open').length
      const claimed = rows.filter(r=>r.status==='claimed').length
      const active = rows.filter(r=>['en_route','picked_up'].includes(r.status)).length
      setCounts({ all, open, claimed, active })
    })
  }, [tab])

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          <div className="logo">🍎</div>
          <div>
            <div>FoodRescueSimple</div>
            <div className="small">Lean dispatch for surplus food → charities</div>
          </div>
        </div>
        <div className="kpis">
          <div className="kpi">Total jobs: <b>{counts.all}</b></div>
          <div className="kpi">Open: <b>{counts.open}</b></div>
          <div className="kpi">Claimed: <b>{counts.claimed}</b></div>
          <div className="kpi">Active: <b>{counts.active}</b></div>
        </div>
        <div className="tabs">
          <div className={`tab ${tab==='admin'?'active':''}`} onClick={()=>setTab('admin')}>Admin</div>
          <div className={`tab ${tab==='driver'?'active':''}`} onClick={()=>setTab('driver')}>Driver</div>
          <a className="tab" href="/api/jobs.csv">Export CSV</a>
        </div>
      </div>
      {tab==='admin' ? <Admin/> : <Driver/>}
      <div className="footer small">v0.1 • Local MVP • No auth enabled</div>
    </div>
  )
}
