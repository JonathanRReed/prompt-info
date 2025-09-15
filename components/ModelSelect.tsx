'use client';
import type { ChangeEvent } from 'react';

interface ModelSelectProps {
  models: string[];
  value: string;
  onChange: (model: string) => void;
  loading: boolean;
}

export default function ModelSelect({ models, value, onChange, loading }: ModelSelectProps) {
  if (loading) {
    return <div>Loading models...</div>;
  }

  if (models.length === 0) {
    return <div className="text-yellow-300 text-sm text-center">No models available.</div>;
  }

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      className="bg-sidebar text-gray-100 p-2 rounded w-full"
    >
      {models.map(modelName => (
        <option key={modelName} value={modelName}>
          {modelName}
        </option>
      ))}
    </select>
  );
}
