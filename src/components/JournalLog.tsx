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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-panel">
        <div className="header">
          <h3>New Entry</h3>
        </div>
        <form onSubmit={handleAddJournal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            rows={6}
            required
            style={{ resize: 'vertical', lineHeight: '1.75' }}
          />
          <div>
            <button type="submit" className="btn btn-outline">
              <PenTool size={16} /> Post Entry
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Past Entries
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {journals.map(j => (
            <div key={j.id} className="journal-entry">
              <div className="journal-entry-title">{j.title}</div>
              <p className="journal-entry-content">{j.content}</p>
              <div className="journal-entry-date">
                {new Date(j.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
          {journals.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No journal entries yet. Write your first one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
