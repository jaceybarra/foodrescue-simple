const api = {
  async createJob(data) {
    const res = await fetch('/api/jobs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)});
    if (!res.ok) throw new Error('Failed to create job');
    return res.json();
  },
  async listJobs(status) {
    const url = status ? `/api/jobs?status=${encodeURIComponent(status)}` : '/api/jobs';
    const res = await fetch(url);
    return res.json();
  },
  async claimJob(id, driver_name) {
    const res = await fetch(`/api/jobs/${id}/claim`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ driver_name })});
    if (!res.ok) throw new Error('Failed to claim');
    return res.json();
  },
  async updateStatus(id, status) {
    const res = await fetch(`/api/jobs/${id}/status`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status })});
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },
  async uploadPhoto(id, file) {
    const fd = new FormData();
    fd.append('photo', file);
    const res = await fetch(`/api/jobs/${id}/photo`, { method:'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
  async listDrivers() {
    const res = await fetch('/api/drivers');
    return res.json();
  },
  async addDriver(name, phone) {
    const res = await fetch('/api/drivers', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, phone })
    });
    if (!res.ok) throw new Error('Failed to add driver');
    return res.json();
  },
  async toggleDriver(id) {
    const res = await fetch(`/api/drivers/${id}/toggle`, { method:'POST' });
    return res.json();
  }
};
export default api;
