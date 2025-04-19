'use client';
import { useState, useEffect } from 'react';

export default function ModelSelect({ onChange }: { onChange: (model: string) => void }) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/llm-data.json')
      .then(res => res.json())
      .then(data => {
        const keys = Object.keys(data);
        setModels(keys);
        if (keys.length) onChange(keys[0]);
      })
      .finally(() => setLoading(false));
  }, [onChange]);

  if (loading) return <div>Loading models...</div>;

  return (
    <select
      onChange={e => onChange(e.target.value)}
      className="bg-sidebar text-gray-100 p-2 rounded"
    >
      {models.map(model => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  );
}
