import React, { useEffect, useState } from 'react'
import api from '../api.js'

export default function Driver() {
  const [jobs, setJobs] = useState([])
  const [name, setName] = useState(localStorage.getItem('driver_name') || '')

  function saveName(v){ setName(v); localStorage.setItem('driver_name', v) }

  async function load() { setJobs(await api.listJobs()) }
  useEffect(()=>{ load() }, [])

  // Realtime
  useEffect(() => {
    const es = new EventSource('/api/stream')
    es.onmessage = () => load()
    return () => es.close()
  }, [])

  async function claim(id) {
    if (!name) { alert('Enter your name first'); return; }
    await api.claimJob(id, name); load()
  }

  async function advance(j) {
    const order = ['open','claimed','en_route','picked_up','delivered']
    const idx = order.indexOf(j.status)
    const next = order[Math.min(order.length-1, idx+1)]
    if (next === 'picked_up') {
      const file = await pickPhoto()
      if (!file) return
      await api.uploadPhoto(j.id, file)
    }
    await api.updateStatus(j.id, next); load()
  }

  function pickPhoto() {
    return new Promise(resolve => {
      const input = document.createElement('input')
      input.type = 'file'; input.accept = 'image/*'
      input.onchange = () => resolve(input.files[0])
      input.click()
    })
  }

  const statusClass = (s)=>`badge ${s}`

  return (
    <div className="grid">
      <div className="card">
        <h3>Driver Identity</h3>
        <label>Your name</label>
        <input value={name} onChange={e=>saveName(e.target.value)} placeholder="e.g., Sam"/>
      </div>

      <div className="card">
        <h3>Available & Active Jobs</h3>
        <div className="list">
          {jobs.map(j => (
            <div key={j.id} className="row">
              <div>
                <div style={{fontWeight:700}}>
                  {j.title} <span className={statusClass(j.status)}>{j.status}</span>
                </div>
                <div className="meta">{j.location} · {j.food_type || '—'}</div>
                <div className="meta">Contact: {j.contact_name || '—'} {j.contact_phone ? '· '+j.contact_phone : ''}</div>
                {j.claimed_by && <div className="meta">Claimed by: {j.claimed_by}</div>}
                {j.photo_path && <div className="small"><a className="btn" href={j.photo_path} target="_blank">View photo</a></div>}
              </div>
              <div style={{display:'flex', gap:8}}>
                {j.status === 'open' && <button className="btn primary" onClick={()=>claim(j.id)}>Claim</button>}
                {j.status !== 'delivered' && j.status !== 'cancelled' && <button className="btn" onClick={()=>advance(j)}>Advance</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}