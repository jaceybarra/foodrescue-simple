import React, { useEffect, useMemo, useState } from 'react'
import api from '../api.js'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import JobDrawer from '../components/JobDrawer.jsx'

const COLUMNS = [
  { key: 'open',       label: 'Open' },
  { key: 'claimed',    label: 'Claimed' },
  { key: 'en_route',   label: 'Active' },
  { key: 'picked_up',  label: 'Picked Up' },
  { key: 'delivered',  label: 'Delivered' },
]

export default function Admin() {
  const [form, setForm] = useState({
    title:'', location:'', food_type:'', expires_at:'', contact_name:'', contact_phone:''
  })
  const [jobs, setJobs] = useState([])
  const [selected, setSelected] = useState(null)

  const grouped = useMemo(() => {
    const m = Object.fromEntries(COLUMNS.map(c => [c.key, []]))
    for (const j of jobs) (m[j.status] || (m[j.status]=[])).push(j)
    return m
  }, [jobs])

  async function load(){ setJobs(await api.listJobs()) }

  useEffect(() => { load() }, [])

  // Real‑time via SSE (Server-Sent Events) — implemented in server.js (/api/stream)
  useEffect(() => {
    const es = new EventSource('/api/stream')
    es.onmessage = () => load()
    return () => es.close()
  }, [])

  async function submit(e){
    e.preventDefault()
    if (!form.title || !form.location){ alert('Title + Location required'); return }
    await api.createJob(form)
    setForm({ title:'', location:'', food_type:'', expires_at:'', contact_name:'', contact_phone:'' })
    load()
  }

  async function onDragEnd(result){
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return
    const id = Number(draggableId.replace('job-', ''))
    const nextStatus = destination.droppableId
    await api.updateStatus(id, nextStatus)
    load()
  }

  async function updateStatus(id, status){
    await api.updateStatus(id, status); await load()
  }

  const badge = (s) => `badge ${s}`

  return (
    <div className="grid" style={{gap:16}}>
      {/* Create Form */}
      <div className="card" style={{maxWidth:420}}>
        <h3>Create Pickup Job</h3>
        <form onSubmit={submit}>
          <label>Title</label>
          <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="e.g., Bakery surplus pickup"/>

          <label>Location</label>
          <input value={form.location} onChange={e=>setForm({...form, location:e.target.value})} placeholder="123 Main St, City"/>

          <div className="split">
            <div>
              <label>Food Type</label>
              <input value={form.food_type} onChange={e=>setForm({...form, food_type:e.target.value})} placeholder="Produce, bread, dairy..."/>
            </div>
            <div>
              <label>Expires At (optional)</label>
              <input value={form.expires_at} onChange={e=>setForm({...form, expires_at:e.target.value})} placeholder="YYYY-MM-DD HH:MM"/>
            </div>
          </div>

          <div className="split">
            <div>
              <label>Contact Name</label>
              <input value={form.contact_name} onChange={e=>setForm({...form, contact_name:e.target.value})} placeholder="Site contact"/>
            </div>
            <div>
              <label>Contact Phone</label>
              <input value={form.contact_phone} onChange={e=>setForm({...form, contact_phone:e.target.value})} placeholder="(555) 555-5555"/>
            </div>
          </div>

          <div style={{marginTop:12, display:'flex', gap:10}}>
            <button className="btn primary" type="submit">Post Job</button>
            <button className="btn ghost" type="button" onClick={()=>setForm({ title:'', location:'', food_type:'', expires_at:'', contact_name:'', contact_phone:'' })}>Clear</button>
          </div>
        </form>
      </div>

      {/* Kanban Board */}
      <div className="card" style={{flex:1}}>
        <h3>Pickup Jobs</h3>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-grid">
            {COLUMNS.map(col => (
              <Droppable droppableId={col.key} key={col.key}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="kanban-col">
                    <div style={{fontWeight:700, marginBottom:8}}>{col.label}</div>
                    {(grouped[col.key] || []).map((j, idx) => (
                      <Draggable draggableId={`job-${j.id}`} index={idx} key={j.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="row"
                            style={{marginBottom:8, cursor:'pointer'}}
                            onClick={()=>setSelected(j)}
                          >
                            <div>
                              <div style={{fontWeight:700}}>
                                {j.title} <span className={badge(j.status)}>{j.status}</span>
                              </div>
                              <div className="meta">{j.location} · {j.food_type || '—'}</div>
                              {j.expires_at && <div className="small">Expires: {j.expires_at}</div>}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>

      <JobDrawer job={selected} onClose={()=>setSelected(null)} onUpdateStatus={updateStatus} />
    </div>
  )
}