import React from 'react'
import { MAPS_API_KEY } from '../config.js'

export default function JobDrawer({ job, onClose, onUpdateStatus }) {
  if (!job) return null
  const mapUrl = MAPS_API_KEY && job.location
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(job.location)}&zoom=13&size=640x320&markers=color:green|${encodeURIComponent(job.location)}&key=${MAPS_API_KEY}`
    : ''

  const nextStatuses = ['open','claimed','en_route','picked_up','delivered','cancelled'].filter(s => s !== job.status)

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e)=>e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">{job.title}</div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="drawer-body">
          <div className="drawer-section">
            <div className="small">Status</div>
            <div style={{marginTop:6}}><span className={`badge ${job.status}`}>{job.status}</span></div>
          </div>

          <div className="drawer-section">
            <div className="small">Location</div>
            <div style={{marginTop:6}}>{job.location || '—'}</div>
            {mapUrl && <img src={mapUrl} alt="Map preview" style={{width:'100%', borderRadius:12, marginTop:10, border:'1px solid var(--line)'}}/>}
          </div>

          <div className="drawer-section">
            <div className="small">Food</div>
            <div style={{marginTop:6}}>{job.food_type || '—'}</div>
          </div>

          <div className="drawer-section">
            <div className="small">Contact</div>
            <div style={{marginTop:6}}>{job.contact_name || '—'} {job.contact_phone ? '· '+job.contact_phone : ''}</div>
          </div>

          <div className="drawer-section">
            <div className="small">Timestamps</div>
            <div style={{marginTop:6}}>Created: {job.created_at}</div>
            <div>Updated: {job.updated_at}</div>
            {job.expires_at && <div>Expires: {job.expires_at}</div>}
          </div>

          {job.photo_path && (
            <div className="drawer-section">
              <div className="small">Proof of Pickup</div>
              <div style={{marginTop:6}}><a className="btn" href={job.photo_path} target="_blank">View photo</a></div>
            </div>
          )}
        </div>
        <div className="drawer-footer">
          {nextStatuses.map(s => (
            <button key={s} className="btn" onClick={()=>onUpdateStatus(job.id, s)}>{`Mark ${s.replace('_',' ')}`}</button>
          ))}
        </div>
      </div>
    </div>
  )
}