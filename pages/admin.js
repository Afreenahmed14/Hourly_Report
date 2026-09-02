import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TL_NAME = "Afreen Ahmed";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'changeme123';

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Minutes since midnight, for comparing HH:MM strings.
function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// True if [aStart, aEnd) overlaps [bStart, bEnd) at all.
function overlaps(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

// "2026-08-30" -> "August 30, 2026"
function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function to12h(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h}:00 ${period}` : `${h}:${String(m).padStart(2, '0')} ${period}`;
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [updates, setUpdates] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [winStart, setWinStart] = useState('16:00');
  const [winEnd, setWinEnd] = useState('18:00');
  const [report, setReport] = useState('');
  const [toast, setToast] = useState('');
  const [viewDate, setViewDate] = useState(todayStr());

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  }

  useEffect(() => {
    if (sessionStorage.getItem('admin_authed') === 'yes') setAuthed(true);
  }, []);

  async function loadAll() {
    const { data: u } = await supabase
      .from('updates')
      .select('*')
      .eq('entry_date', viewDate)
      .order('name')
      .order('start_time');
    setUpdates(u || []);
    const { data: n } = await supabase.from('notes').select('*').order('created_at');
    setNotes(n || []);
  }

  useEffect(() => {
    if (authed) loadAll();
  }, [authed, viewDate]);

  function handleLogin() {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', 'yes');
      setAuthed(true);
    } else {
      showToast('Wrong password');
    }
  }

  async function deleteUpdate(id) {
    const { error } = await supabase.from('updates').delete().eq('id', id);
    if (!error) { showToast('Update deleted'); loadAll(); }
  }

  async function clearAll() {
    if (!confirm('Clear ALL updates and notes across every date? This cannot be undone.')) return;
    await supabase.from('updates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    showToast('All data cleared');
    loadAll();
  }

  async function addNote() {
    if (!noteText.trim()) { showToast('Enter a note first'); return; }
    const { error } = await supabase.from('notes').insert({ text: noteText.trim() });
    if (!error) { setNoteText(''); showToast('Note added'); loadAll(); }
  }

  async function deleteNote(id) {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) { showToast('Note deleted'); loadAll(); }
  }

  function generateReport() {
    // Only include entries whose time slot overlaps the chosen reporting window.
    const inWindow = updates.filter(u => overlaps(u.start_time, u.end_time, winStart, winEnd));

    if (inWindow.length === 0) {
      setReport('');
      showToast('No updates fall inside that time window');
      return;
    }

    const byMember = {};
    inWindow.forEach(u => {
      if (!byMember[u.name]) byMember[u.name] = [];
      byMember[u.name].push(u);
    });
    Object.values(byMember).forEach(arr => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));

    const names = Object.keys(byMember).sort((a, b) => {
      if (a === TL_NAME) return -1;
      if (b === TL_NAME) return 1;
      return a.localeCompare(b);
    });

    const heading = viewDate === todayStr()
      ? `Today's Updates (${to12h(winStart)} to ${to12h(winEnd)}):`
      : `Updates for ${formatDateLong(viewDate)} (${to12h(winStart)} to ${to12h(winEnd)}):`;

    let lines = [];
    lines.push('Hi @Anagha Manager Mam,');
    lines.push('Work Update – MERN Team');
    lines.push(heading);
    lines.push('');

    names.forEach((name, i) => {
      const entries = byMember[name];
      const roleTag = entries[0].role ? ` (${entries[0].role})` : '';
      if (entries.length === 1) {
        const e = entries[0];
        lines.push(`${i + 1}. ${name}${roleTag}: ${e.task}`);
      } else {
        const parts = entries.map(e =>
          `From ${to12h(e.start_time)} to ${to12h(e.end_time)}, ${e.task.charAt(0).toLowerCase() + e.task.slice(1)}`
        );
        lines.push(`${i + 1}. ${name}${roleTag}: ${parts.join(' ')}`);
      }
    });

    if (notes.length > 0) {
      lines.push('');
      notes.forEach(n => lines.push(`Note: ${n.text}`));
    }

    setReport(lines.join('\n'));
    showToast('Report generated');
  }

  function copyReport() {
    navigator.clipboard.writeText(report).then(
      () => showToast('Report copied — paste it to WhatsApp'),
      () => showToast('Copy failed — select text manually')
    );
  }

  if (!authed) {
    return (
      <div className="wrap">
        <div className="login-box card">
          <h2>Admin login</h2>
          <div className="field full" style={{ marginBottom: 14 }}>
            <label>Password</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter admin password"
            />
          </div>
          <button className="primary" onClick={handleLogin}>Log in</button>
        </div>
        <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Admin dashboard</h1>
          <p>Team Work Update Manager</p>
        </div>
      </header>

      <nav>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}>Common notes</button>
        <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>Generate report</button>
      </nav>

      {tab === 'dashboard' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ margin: 0 }}>All updates ({updates.length})</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="date"
                value={viewDate}
                onChange={e => setViewDate(e.target.value)}
                style={{ width: 'auto' }}
              />
              <button className="danger" onClick={clearAll}>Clear all data</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>Member</th><th>Time</th><th>Update</th><th>Action</th></tr>
              </thead>
              <tbody>
                {updates.length === 0 ? (
                  <tr><td colSpan={4}><p className="empty">No updates submitted yet.</p></td></tr>
                ) : updates.map(u => (
                  <tr key={u.id}>
                    <td className="name-cell">{u.name}{u.role && <span className="badge">{u.role}</span>}</td>
                    <td className="time-cell">{to12h(u.start_time)} – {to12h(u.end_time)}</td>
                    <td>{u.task}</td>
                    <td className="actions-cell">
                      <button className="danger small" onClick={() => deleteUpdate(u.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <div className="card">
          <h2>Common notes</h2>
          <p className="helper" style={{ marginTop: -8, marginBottom: 14 }}>
            Things like birthday celebrations or shared events — shown in the report.
          </p>
          <div className="field full" style={{ marginBottom: 12 }}>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g. All team members except Anjana and Kamal participated in the office birthday celebration from 5:00 PM to 5:30 PM." />
          </div>
          <div className="btnbar" style={{ marginBottom: 16 }}>
            <button className="primary" onClick={addNote}>Add note</button>
          </div>
          {notes.length === 0 ? (
            <p className="empty">No common notes added yet.</p>
          ) : notes.map(n => (
            <div className="noteitem" key={n.id}>
              <p>{n.text}</p>
              <button className="danger small" onClick={() => deleteNote(n.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'report' && (
        <>
          <div className="card">
            <h2>Reporting window</h2>
            <p className="helper" style={{ marginTop: -8, marginBottom: 14 }}>
              Report covers {viewDate} (change the date on the Dashboard tab) and only entries whose time slot falls in the window below.
            </p>
            <div className="row">
              <div className="field">
                <label>From</label>
                <input type="time" value={winStart} onChange={e => setWinStart(e.target.value)} />
              </div>
              <div className="field">
                <label>To</label>
                <input type="time" value={winEnd} onChange={e => setWinEnd(e.target.value)} />
              </div>
            </div>
            <div className="btnbar">
              <button className="primary" onClick={generateReport}>Generate WhatsApp report</button>
            </div>
          </div>
          {report && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Report preview</h2>
                <button className="secondary small" onClick={copyReport}>Copy report</button>
              </div>
              <div className="report-box">{report}</div>
            </div>
          )}
        </>
      )}

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
