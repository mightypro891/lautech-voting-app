import { useEffect, useMemo, useState } from 'react';
import CandidateCard from '../components/CandidateCard';
import CandidateProfileModal from '../components/CandidateProfileModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Candidate, SystemSettings, VoterRecord } from '../types';
import {
  fetchRecentVoteCounts,
  fetchSystemSettings,
  fetchVoterRecord,
  getVoterId,
  subscribeCandidates,
  voteForCandidate,
} from '../services/votingService';

function groupByPosition(candidates: Candidate[]) {
  return candidates.reduce<Record<string, Candidate[]>>((acc, item) => {
    acc[item.position] = acc[item.position] ?? [];
    acc[item.position].push(item);
    return acc;
  }, {});
}

interface VoteStreakData {
  currentStreak: number;
  lastVoteTime: number;
}

const STREAK_STORAGE_KEY = 'voteStreak';

function loadVoteStreak(): VoteStreakData {
  const raw = localStorage.getItem(STREAK_STORAGE_KEY);
  if (!raw) return { currentStreak: 0, lastVoteTime: 0 };
  try {
    return JSON.parse(raw) as VoteStreakData;
  } catch {
    return { currentStreak: 0, lastVoteTime: 0 };
  }
}

function saveVoteStreak(streak: VoteStreakData) {
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '00h 00m 00s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export default function VotePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ votingOpen: true, resultsVisible: false, cooldownHours: 24 });
  const [voter, setVoter] = useState<VoterRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [recentVoteCounts, setRecentVoteCounts] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState<VoteStreakData>(loadVoteStreak());
  const [countdown, setCountdown] = useState('');
  const [showVoteConfirm, setShowVoteConfirm] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeCandidates((items) => {
      setCandidates(items);
      setLoading(false);
    });
    fetchSystemSettings().then(setSettings);
    fetchRecentVoteCounts().then(setRecentVoteCounts);
    fetchVoterRecord(getVoterId()).then((record) => setVoter(record));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!voter) {
        setCountdown('Ready to vote');
        return;
      }
      const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
      const nextTime = voter.lastVoteTime + cooldownMs;
      const remaining = nextTime - Date.now();
      setCountdown(formatCountdown(remaining));
    }, 1000);
    return () => clearInterval(interval);
  }, [settings, voter]);

  const grouped = useMemo(() => groupByPosition(candidates), [candidates]);

  const canVote = useMemo(() => {
    if (!settings.votingOpen) return false;
    if (!voter) return true;
    const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
    return Date.now() - voter.lastVoteTime >= cooldownMs;
  }, [settings, voter]);

  const nextVoteTime = useMemo(() => {
    if (!voter) return null;
    return new Date(voter.lastVoteTime + settings.cooldownHours * 60 * 60 * 1000);
  }, [settings, voter]);

  const streakMessage = useMemo(() => {
    if (streak.currentStreak <= 0) return 'Start your first streak today!';
    return `🔥 You’re on a ${streak.currentStreak}-day streak`;
  }, [streak.currentStreak]);

  const sortedCandidates = useMemo(
    () => [...candidates].sort((a, b) => b.votes - a.votes),
    [candidates]
  );

  const trendBadge = (candidate: Candidate) => {
    const currentCount = recentVoteCounts[candidate.id] || 0;
    if (currentCount >= 5) return '🔥 Trending';
    if (currentCount >= 3) return '🚀 Rising';
    if (candidate.id === sortedCandidates[0]?.id) return '👑 Leading';
    return '';
  };

  async function handleVote(candidateId: string) {
    setStatus(null);
    setSubmitting(true);
    try {
      await voteForCandidate(candidateId);
      const updatedVoter = await fetchVoterRecord(getVoterId());
      setVoter(updatedVoter);
      setShowVoteConfirm(true);
      setHighlightId(candidateId);
      setTimeout(() => setShowVoteConfirm(false), 2600);
      setTimeout(() => setHighlightId(null), 1200);

      const now = Date.now();
      const lastVote = streak.lastVoteTime;
      const isWithin48Hours = now - lastVote <= 48 * 60 * 60 * 1000;
      const isAfter24Hours = now - lastVote >= 24 * 60 * 60 * 1000;
      const newStreak = isAfter24Hours && isWithin48Hours ? streak.currentStreak + 1 : 1;
      const streakData = { currentStreak: newStreak, lastVoteTime: now };
      saveVoteStreak(streakData);
      setStreak(streakData);

      setStatus('✅ Your vote has been recorded!');
      if (navigator.vibrate) navigator.vibrate(120);
    } catch (error) {
      setStatus((error as Error).message || 'Unable to cast vote.');
    } finally {
      setSubmitting(false);
    }
  }

  const openCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const closeCandidate = () => {
    setSelectedCandidate(null);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft transition duration-500 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Vote page</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">Choose your favorite candidate</h1>
          </div>
          <div className="rounded-3xl bg-slate-100 px-4 py-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Voting is {settings.votingOpen ? 'Open' : 'Closed'} • Cooldown {settings.cooldownHours} hours
          </div>
        </div>

        <div className="mt-4 grid gap-4 rounded-3xl bg-slate-50 p-5 text-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Next vote</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {canVote ? 'Vote now' : countdown}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Streak</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{streak.currentStreak || 0} days</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{streakMessage}</p>
          </div>
        </div>

        {status ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            {status}
          </div>
        ) : null}
      </section>

      {showVoteConfirm ? (
        <section className="rounded-4xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-soft dark:bg-emerald-950/40 dark:border-emerald-600 dark:text-emerald-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-white">✓</div>
            <div>
              <p className="text-lg font-semibold">Your vote has been recorded</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Come back when the countdown ends to vote again.</p>
            </div>
          </div>
        </section>
      ) : null}

      {loading ? (
        <LoadingSpinner />
      ) : candidates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">No candidates yet.</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.7fr_0.3fr]">
          <div className="space-y-6">
            {Object.entries(grouped).map(([position, items]) => (
              <div key={position} className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{position}</h2>
                <div className="grid gap-4 sm:grid-cols-1">
                  {items
                    .sort((a, b) => b.votes - a.votes)
                    .map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        highlight={highlightId === candidate.id}
                        actionLabel={canVote ? 'Vote' : 'Locked'}
                        onAction={canVote ? handleVote : undefined}
                        onView={openCandidate}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-6 rounded-4xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-950">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Live leaderboard</p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Top candidates</h2>
            </div>
            <div className="space-y-3">
              {sortedCandidates.slice(0, 3).map((candidate, index) => (
                <div key={candidate.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-500">#{index + 1}</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{candidate.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{trendBadge(candidate)}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{candidate.votes}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Trending</p>
              <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {sortedCandidates.slice(0, 5).map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between gap-2">
                    <span>{candidate.name}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {trendBadge(candidate) || 'Stable'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {selectedCandidate ? (
        <CandidateProfileModal
          candidate={selectedCandidate}
          isOpen={true}
          isVoting={submitting}
          canVote={canVote}
          onClose={closeCandidate}
          onVote={handleVote}
        />
      ) : null}
    </div>
  );
}
