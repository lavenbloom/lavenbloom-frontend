import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PenTool } from 'lucide-react';

export default function JournalLog() {
  const [journals, setJournals] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    try {
      const res = await api.get('/journal/journals');
      setJournals(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    try {
      await api.post('/journal/journals', { title, content });
      setTitle('');
      setContent('');
      fetchJournals();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="glass-panel">
      <div className="header">
        <h3>Journal Logs</h3>
      </div>
      
      <form onSubmit={handleAddJournal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Entry Title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          required
        />
        <textarea 
          placeholder="Write your thoughts..." 
          value={content} 
          onChange={e => setContent(e.target.value)} 
          rows={3}
          required
        />
        <button type="submit" className="btn btn-outline" style={{ alignSelf: 'flex-start' }}><PenTool size={18} style={{marginRight: '0.5rem'}}/> Post Log</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {journals.map(j => (
          <div key={j.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--accent-color)' }}>{j.title}</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{j.content}</p>
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {new Date(j.created_at).toLocaleString()}
            </div>
          </div>
        ))}
        {journals.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No journal entries yet.</p>}
      </div>
    </div>
  );
}
