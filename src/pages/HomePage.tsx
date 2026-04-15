import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CandidateCard from '../components/CandidateCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Candidate, SystemSettings } from '../types';
import { subscribeCandidates, subscribeSettings } from '../services/votingService';

function groupByPosition(candidates: Candidate[]) {
  return candidates.reduce<Record<string, Candidate[]>>((acc, item) => {
    acc[item.position] = acc[item.position] ?? [];
    acc[item.position].push(item);
    return acc;
  }, {});
}

export default function HomePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ votingOpen: true, resultsVisible: false, cooldownHours: 24 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCandidates = subscribeCandidates((items) => {
      setCandidates(items);
      setLoading(false);
    });
    const unsubSettings = subscribeSettings((value) => setSettings(value));
    return () => {
      unsubCandidates();
      unsubSettings();
    };
  }, []);

  const grouped = useMemo(() => groupByPosition(candidates), [candidates]);

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Voting Dashboard</p>
          <h1 className="text-4xl font-semibold text-slate-900">Daily anonymous voting for Agric Class 29</h1>
          <p className="text-slate-600">
            Vote once every {settings.cooldownHours} hours. Results are {settings.resultsVisible ? 'visible' : 'hidden'}.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/vote" className="rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-soft transition hover:bg-slate-800">
              Cast a vote
            </Link>
            <Link to="/results" className="rounded-2xl border border-slate-200 px-5 py-3 text-slate-700 transition hover:border-slate-400">
              View results
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-900">Candidates</h2>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">{candidates.length} candidates</span>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : candidates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center text-slate-600">
            No candidates have been added yet.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {Object.entries(grouped).map(([position, items]) => (
              <div key={position} className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-800">{position}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((candidate) => (
                    <CandidateCard key={candidate.id} candidate={candidate} showVotes={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
