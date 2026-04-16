import { useState } from 'react';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Candidate } from '../types';

interface AdminControlsProps {
  candidates: Candidate[];
  onRefresh?: () => void;
}

export default function AdminControls({ candidates, onRefresh }: AdminControlsProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetVotes = async () => {
    if (!window.confirm('Are you sure? This will reset ALL votes to 0. This action cannot be undone.')) {
      return;
    }

    setIsResetting(true);
    try {
      const promises = candidates.map((candidate) =>
        updateDoc(doc(db, 'candidates', candidate.id), { votes: 0 })
      );

      await Promise.all(promises);

      // Log the action
      await addDoc(collection(db, 'activities'), {
        type: 'settings_changed',
        timestamp: Date.now(),
        details: 'Admin reset all votes to 0',
      });

      alert('✅ All votes have been reset to 0');
      if (onRefresh) onRefresh();
    } catch (error) {
      alert(`❌ Error resetting votes: ${(error as Error).message}`);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Advanced Controls</h3>

      <div className="space-y-4">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">
            ⚠️ Resetting votes will set all candidates' vote count to zero. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isResetting}
            className="mt-3 rounded-3xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
          >
            {isResetting ? 'Resetting...' : 'Reset All Votes'}
          </button>
        </div>

        {showResetConfirm && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Confirm reset?</p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleResetVotes}
                className="rounded-2xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes, reset all
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
