import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TEAM = [
  "Afreen Ahmed", "Vinay", "Sai Dhanush", "James J", "Spandana", "Tejaswini",
  "Susmitha", "Veeksha", "Sneha", "Sachin", "Rahul", "Praveen", "Anjana", "Kamal"
  // Add the rest of your 20 members here.
];
const TL_NAME = "Afreen Ahmed";

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function to12h(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h}:00 ${period}` : `${h}:${String(m).padStart(2, '0')} ${period}`;
}

export default function Home() {
  const [name, setName] = useState(TEAM[0]);
  const [start, setStart] = useState('16:00');
  const [end, setEnd] = useState('17:00');
  const [task, setTask] = useState('');
  const [mine, setMine] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  }

  async function loadMine(forName) {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .eq('name', forName)
      .eq('entry_date', todayStr())
      .order('start_time', { ascending: true });
    if (!error) setMine(data || []);
  }

  useEffect(() => {
    loadMine(name);
  }, [name]);

  async function handleSave() {
    if (!task.trim()) {
      showToast('Enter a work update first');
      return;
    }
    if (!start || !end) {
      showToast('Set a start and end time');
      return;
    }
    setLoading(true);
    if (editingId) {
      const { error } = await supabase
        .from('updates')
        .update({ name, start_time: start, end_time: end, task: task.trim() })
        .eq('id', editingId);
      if (error) showToast('Save failed — try again');
      else showToast('Update saved');
    } else {
      const role = name === TL_NAME ? 'TL' : null;
      const { error } = await supabase
        .from('updates')
        .insert({ name, role, entry_date: todayStr(), start_time: start, end_time: end, task: task.trim() });
      if (error) showToast('Save failed — try again');
      else showToast('Update added');
    }
    setLoading(false);
    setEditingId(null);
    setTask('');
    loadMine(name);
  }

  function startEdit(u) {
    setEditingId(u.id);
    setStart(u.start_time);
    setEnd(u.end_time);
    setTask(u.task);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setTask('');
  }

  async function deleteMine(id) {
    const { error } = await supabase.from('updates').delete().eq('id', id);
    if (error) showToast('Delete failed');
    else { showToast('Update deleted'); loadMine(name); }
  }

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Team Work Update Manager</h1>
          <p>MERN Team &middot; hourly reporting</p>
        </div>
      </header>

      <div className="sync-note">Pick your name, log your update for the hour, and it's sent straight to the manager dashboard.</div>

      <div className="card">
        <h2>{editingId ? 'Edit work update' : 'Add a work update'}</h2>
        <div className="row">
          <div className="field">
            <label>Your name</label>
            <select value={name} onChange={e => setName(e.target.value)} disabled={!!editingId}>
              {TEAM.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="field" />
        </div>
        <div className="row">
          <div className="field">
            <label>From</label>
            <input type="time" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label>To</label>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="field full" style={{ marginBottom: 14 }}>
          <label>Work update</label>
          <textarea value={task} onChange={e => setTask(e.target.value)} placeholder="What did you work on in this slot?" />
        </div>
        <div className="btnbar">
          <button className="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save update'}
          </button>
          {editingId && <button className="secondary" onClick={cancelEdit}>Cancel edit</button>}
        </div>
      </div>

      <div className="card">
        <h2>Your entries today</h2>
        {mine.length === 0 ? (
          <p className="empty">No entries yet.</p>
        ) : (
          mine.map(u => (
            <div className="noteitem" key={u.id}>
              <div>
                <span className="time-cell">{to12h(u.start_time)} – {to12h(u.end_time)}</span>
                <p>{u.task}</p>
              </div>
              <div className="actions-cell">
                <button className="secondary small" onClick={() => startEdit(u)}>Edit</button>
                <button className="danger small" onClick={() => deleteMine(u.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
