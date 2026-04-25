import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, X, Check } from 'lucide-react';

const BUILT_IN: { value: string; label: string }[] = [
  { value: 'weight', label: 'Weight (kg)' },
  { value: 'sleep',  label: 'Sleep (hrs)' },
];

function loadCustomMetrics(): { value: string; label: string }[] {
  try {
    return JSON.parse(localStorage.getItem('customMetrics') || '[]');
  } catch { return []; }
}

function saveCustomMetrics(metrics: { value: string; label: string }[]) {
  localStorage.setItem('customMetrics', JSON.stringify(metrics));
}

function metricLabel(value: string, all: { value: string; label: string }[]): string {
  return all.find(m => m.value === value)?.label ?? value;
}

export default function MetricsChart() {
  const [data, setData] = useState<any[]>([]);
  const [metricType, setMetricType] = useState('weight');
  const [newValue, setNewValue] = useState('');
  const [customMetrics, setCustomMetrics] = useState<{ value: string; label: string }[]>(loadCustomMetrics);
  const [addingMetric, setAddingMetric] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');

  const allMetrics = [...BUILT_IN, ...customMetrics];

  useEffect(() => {
    fetchMetrics();
  }, [metricType]);

  const fetchMetrics = async () => {
    try {
      const res = await api.get(`/habit/metrics?metric_type=${metricType}`);
      const sorted = res.data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setData(sorted);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;
    try {
      const date = new Date().toISOString().split('T')[0];
      await api.post(`/habit/metrics/${date}`, { metric_type: metricType, value: parseFloat(newValue) });
      setNewValue('');
      fetchMetrics();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmAddMetricType = () => {
    const key = newMetricName.trim().toLowerCase().replaceAll(/\s+/g, '_');
    if (!key || allMetrics.some(m => m.value === key)) { setAddingMetric(false); setNewMetricName(''); return; }
    const updated = [...customMetrics, { value: key, label: newMetricName.trim() }];
    setCustomMetrics(updated);
    saveCustomMetrics(updated);
    setMetricType(key);
    setAddingMetric(false);
    setNewMetricName('');
  };

  const removeCustomMetric = (value: string) => {
    const updated = customMetrics.filter(m => m.value !== value);
    setCustomMetrics(updated);
    saveCustomMetrics(updated);
    if (metricType === value) setMetricType('weight');
  };

  return (
    <div className="glass-panel">
      <div className="header">
        <h3>Metrics Tracker</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {addingMetric ? (
            <>
              <input
                autoFocus
                type="text"
                placeholder="Metric name…"
                value={newMetricName}
                onChange={e => setNewMetricName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { confirmAddMetricType(); } else if (e.key === 'Escape') { setAddingMetric(false); setNewMetricName(''); } }}
                style={{ width: '140px', padding: '0.4rem 0.6rem', fontSize: '0.875rem' }}
              />
              <button onClick={confirmAddMetricType} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7b35d4', display: 'flex', alignItems: 'center', padding: '0.25rem' }}>
                <Check size={16} />
              </button>
              <button onClick={() => { setAddingMetric(false); setNewMetricName(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <select value={metricType} onChange={e => setMetricType(e.target.value)}>
                {allMetrics.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {customMetrics.some(m => m.value === metricType) && (
                <button onClick={() => removeCustomMetric(metricType)} title="Remove this metric type" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}>
                  <X size={14} />
                </button>
              )}
              <button onClick={() => setAddingMetric(true)} title="Add custom metric" style={{ background: 'none', border: '1px solid var(--panel-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.3rem' }}>
                <Plus size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleAddMetric} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input
          type="number"
          step="0.1"
          placeholder={`Log today's ${metricLabel(metricType, allMetrics)}…`}
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-outline">Log</button>
      </form>

      <div style={{ height: '250px', width: '100%' }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,106,178,0.12)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={11} domain={['auto', 'auto']} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#251e55', border: '1px solid rgba(155,106,178,0.3)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(29,18,80,0.5)' }}
                itemStyle={{ color: '#c4aaf0' }}
                labelStyle={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}
              />
              <Line type="monotone" dataKey="value" stroke="#9b6ab2" strokeWidth={2.5} dot={{ r: 4, fill: '#1c1642', stroke: '#9b6ab2', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#c4aaf0' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            No data yet for <em style={{ marginLeft: '0.3rem' }}>{metricLabel(metricType, allMetrics)}</em>.
          </div>
        )}
      </div>
    </div>
  );
}
