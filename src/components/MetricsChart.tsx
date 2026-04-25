import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function MetricsChart() {
  const [data, setData] = useState<any[]>([]);
  const [metricType, setMetricType] = useState('weight');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, [metricType]);

  const fetchMetrics = async () => {
    try {
      const res = await api.get(`/habit/metrics?metric_type=${metricType}`);
      // Sort by date
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

  return (
    <div className="glass-panel">
      <div className="header">
        <h3>Metrics Tracker</h3>
        <select 
          value={metricType} 
          onChange={e => setMetricType(e.target.value)}
        >
          <option value="weight">Weight</option>
          <option value="sleep">Sleep Hours</option>
        </select>
      </div>

      <form onSubmit={handleAddMetric} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input 
          type="number" 
          step="0.1"
          placeholder={`Log today's ${metricType}...`} 
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
            No data available for {metricType}.
          </div>
        )}
      </div>
    </div>
  );
}
