import { useState } from 'react';
import { createCandidate } from '../services/votingService';
import { Candidate } from '../types';

interface BulkImportProps {
  onImport?: (count: number) => void;
}

export default function BulkImport({ onImport }: BulkImportProps) {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatus('Processing CSV...');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());
      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());

      if (!header.includes('name') || !header.includes('position')) {
        throw new Error('CSV must have "name" and "position" columns');
      }

      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: Record<string, string> = {};

        header.forEach((col, idx) => {
          row[col] = values[idx] || '';
        });

        if (!row.name || !row.position) continue;

        await createCandidate({
          name: row.name,
          position: row.position,
          manifesto: row.manifesto || '',
          imageUrl: '',
          imagePath: '',
        });

        importedCount += 1;
        setStatus(`Imported ${importedCount}/${lines.length - 1} candidates...`);
      }

      setStatus(`✅ Successfully imported ${importedCount} candidates!`);
      if (onImport) onImport(importedCount);
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus(`❌ Error: ${(error as Error).message}`);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Bulk Import Candidates</h3>

      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Upload a CSV file with columns: <code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">name</code>,{' '}
          <code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">position</code>,{' '}
          <code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">manifesto</code> (optional)
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={importing}
          className="block w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />

        {status && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
