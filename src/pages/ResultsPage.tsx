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
      <div className="rounded-4xl border border-slate-200 bg-white p-12 text-center shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-900">Results are hidden</h1>
        <p className="mt-4 text-slate-600">The admin has chosen to keep rankings private for now. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Live results</p>
          <h1 className="text-3xl font-semibold text-slate-900">Current vote rankings</h1>
          <p className="text-slate-600">Results refresh in real time when votes are cast.</p>
        </div>
      </section>

      {loading ? (
        <LoadingSpinner />
      ) : candidates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center text-slate-600">No vote data available yet.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {candidates.map((candidate, index) => (
            <div key={candidate.id} className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-slate-500">#{index + 1}</p>
                  <p className="text-xl font-semibold text-slate-900">{candidate.name}</p>
                  <p className="text-sm text-slate-600">{candidate.position}</p>
                </div>
                <div className="rounded-3xl bg-slate-900 px-4 py-2 text-white">{candidate.votes} votes</div>
              </div>
              <CandidateCard candidate={candidate} showVotes />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
