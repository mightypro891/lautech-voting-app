import { useEffect, useState } from 'react';
import CandidateCard from '../components/CandidateCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Candidate, SystemSettings } from '../types';
import { fetchSystemSettings, subscribeCandidates, subscribeSettings } from '../services/votingService';

export default function ResultsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ votingOpen: true, resultsVisible: false, cooldownHours: 24 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCandidates = subscribeCandidates((items) => {
      setCandidates(items.sort((a, b) => b.votes - a.votes));
      setLoading(false);
    });
    const unsubSettings = subscribeSettings((value) => setSettings(value));
    return () => {
      unsubCandidates();
      unsubSettings();
    };
  }, []);

  if (!settings.resultsVisible) {
    return (
      <div className="rounded-4xl border border-slate-200 bg-white p-12 text-center shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Results are hidden</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400">The admin has chosen to keep rankings private for now. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Live results</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Current vote rankings</h1>
          <p className="text-slate-600 dark:text-slate-300">Results refresh in real time when votes are cast.</p>
        </div>
      </section>

      {loading ? (
        <LoadingSpinner />
      ) : candidates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">No vote data available yet.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {candidates.slice(0, 3).map((candidate, index) => (
              <div key={candidate.id} className="rounded-4xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Top {index + 1}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{candidate.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{candidate.position}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                </div>
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Votes</p>
                  <p className="mt-2 text-4xl font-semibold text-slate-900 dark:text-slate-100">{candidate.votes}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {candidates.map((candidate, index) => (
              <div key={candidate.id} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">#{index + 1}</p>
                    <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{candidate.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{candidate.position}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-900 px-4 py-2 text-white dark:bg-slate-700">{candidate.votes} votes</div>
                </div>
                <CandidateCard candidate={candidate} showVotes />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
