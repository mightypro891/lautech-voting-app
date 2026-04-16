import { useState } from 'react';
import { Candidate } from '../types';

interface SearchAndFilterProps {
  candidates: Candidate[];
  onFilter: (filtered: Candidate[]) => void;
}

export default function SearchAndFilter({ candidates, onFilter }: SearchAndFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');

  const positions = Array.from(new Set(candidates.map((c) => c.position)));

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterCandidates(term, selectedPosition);
  };

  const handlePositionFilter = (position: string) => {
    setSelectedPosition(position);
    filterCandidates(searchTerm, position);
  };

  const filterCandidates = (term: string, position: string) => {
    let filtered = candidates;

    if (term) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(term.toLowerCase()) ||
          c.manifesto?.toLowerCase().includes(term.toLowerCase())
      );
    }

    if (position) {
      filtered = filtered.filter((c) => c.position === position);
    }

    onFilter(filtered);
  };

  return (
    <div className="space-y-4 rounded-4xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">Search candidates</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Name or manifesto..."
            className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">Filter by position</label>
          <select
            value={selectedPosition}
            onChange={(e) => handlePositionFilter(e.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All positions</option>
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{candidates.length} candidates selected</p>
    </div>
  );
}
