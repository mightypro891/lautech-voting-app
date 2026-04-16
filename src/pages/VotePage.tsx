import { useEffect, useMemo, useState } from 'react';
import CandidateCard from '../components/CandidateCard';
import CandidateProfileModal from '../components/CandidateProfileModal';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchAndFilter from '../components/SearchAndFilter';
import { Candidate, SystemSettings, VoterRecord } from '../types';
import { useFavorites } from '../hooks/useFavorites';
import {
  fetchRecentVoteCounts,
  fetchSystemSettings,
  fetchVoterRecord,
  getVoterId,
  subscribeCandidates,
  voteForCandidate,
  voteForMultipleCandidates,
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
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({ votingOpen: true, resultsVisible: false, cooldownHours: 24 });
  const [voter, setVoter] = useState<VoterRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({}); // position -> candidateId
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [streak, setStreak] = useState<VoteStreakData>(loadVoteStreak());
  const [countdown, setCountdown] = useState('Ready to vote');
  const [recentVoteCounts, setRecentVoteCounts] = useState<Record<string, number>>({});
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [pendingVoteCandidate, setPendingVoteCandidate] = useState<Candidate | null>(null);

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && pendingVoteCandidate) {
        cancelVote();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pendingVoteCandidate]);

  const grouped = useMemo(() => groupByPosition(candidates), [candidates]);

  const canVote = useMemo(() => {
    if (!settings.votingOpen) return false;
    if (!voter) return true;
    const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
    return Date.now() - voter.lastVoteTime >= cooldownMs;
  }, [settings, voter]);

  const hasVoted = useMemo(() => {
    return voter && voter.lastVoteTime > 0;
  }, [voter]);

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

  const selectCandidateForPosition = (position: string, candidateId: string) => {
    setSelectedCandidates(prev => ({
      ...prev,
      [position]: candidateId
    }));
  };

  const getSelectedCandidateForPosition = (position: string) => {
    const candidateId = selectedCandidates[position];
    return candidateId ? candidates.find(c => c.id === candidateId) : null;
  };

  const getTotalSelectedPositions = () => Object.keys(selectedCandidates).length;
  const getTotalPositions = () => Object.keys(grouped).length;

  async function handleBulkVote() {
    const selectedCount = getTotalSelectedPositions();
    if (selectedCount === 0) {
      setStatus('Please select at least one candidate to vote for.');
      return;
    }

    setStatus(null);
    setSubmitting(true);
    try {
      await voteForMultipleCandidates(selectedCandidates);
      const updatedVoter = await fetchVoterRecord(getVoterId());
      setVoter(updatedVoter);
      setShowBulkConfirm(true);
      setTimeout(() => setShowBulkConfirm(false), 3000);

      const now = Date.now();
      const lastVote = streak.lastVoteTime;
      const isWithin48Hours = now - lastVote <= 48 * 60 * 60 * 1000;
      const isAfter24Hours = now - lastVote >= 24 * 60 * 60 * 1000;
      const newStreak = isAfter24Hours && isWithin48Hours ? streak.currentStreak + 1 : 1;
      const streakData = { currentStreak: newStreak, lastVoteTime: now };
      saveVoteStreak(streakData);
      setStreak(streakData);

      setStatus(`✅ Your votes for ${selectedCount} position${selectedCount > 1 ? 's' : ''} have been recorded!`);
      if (navigator.vibrate) navigator.vibrate(120);

      // Clear selections after successful vote
      setSelectedCandidates({});
    } catch (error) {
      setStatus((error as Error).message || 'Unable to cast votes.');
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

  const cancelVote = () => {
    setPendingVoteCandidate(null);
  };

  async function handleVote(candidateId: string) {
    setStatus(null);
    setSubmitting(true);
    try {
      await voteForCandidate(candidateId);
      const updatedVoter = await fetchVoterRecord(getVoterId());
      setVoter(updatedVoter);
      setSelectedCandidate(null);

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

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft transition duration-500 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Award Night Voting</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {hasVoted ? 'Vote again for all positions' : 'Vote for all positions'}
            </h1>
            {hasVoted && voter && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                You last voted {Math.floor((Date.now() - voter.lastVoteTime) / (1000 * 60 * 60))} hours ago. 
                {canVote ? 'You can vote again now.' : `Next vote in ${countdown}.`}
              </p>
            )}
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Selected: {getTotalSelectedPositions()} / {getTotalPositions()} positions
            </p>
          </div>
          <div className="rounded-3xl bg-slate-100 px-4 py-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Voting is {settings.votingOpen ? 'Open' : 'Closed'} • Vote cooldown: {settings.cooldownHours} hours
          </div>
        </div>

        <div className="mt-4 grid gap-4 rounded-3xl bg-slate-50 p-5 text-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Next vote</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {canVote ? 'Can vote now' : countdown}
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

      {showBulkConfirm ? (
        <section className="rounded-4xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-soft dark:bg-emerald-950/40 dark:border-emerald-600 dark:text-emerald-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-white">✓</div>
            <div>
              <p className="text-lg font-semibold">
                All votes recorded successfully!
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Come back after 24 hours to vote again.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {loading ? (
        <LoadingSpinner />
      ) : candidates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">No candidates yet.</div>
      ) : (
        <>
          <SearchAndFilter candidates={candidates} onFilter={setFilteredCandidates} />

          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Browse candidates</h2>
            <button
              type="button"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`rounded-3xl px-4 py-2 text-sm font-semibold transition ${
                showFavoritesOnly
                  ? 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              ⭐ {showFavoritesOnly ? `My Favorites (${favorites.length})` : 'Show Favorites'}
            </button>
          </div>

          <div className="space-y-8">
            {Object.entries(grouped).map(([position, items]) => {
              const displayItems = showFavoritesOnly
                ? items.filter((c) => isFavorite(c.id))
                : filteredCandidates.length > 0
                  ? items.filter((c) => filteredCandidates.includes(c))
                  : items;

              if (displayItems.length === 0) return null;

              const selectedCandidate = getSelectedCandidateForPosition(position);

              return (
                <div key={position} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{position}</h2>
                    {selectedCandidate && (
                      <div className="flex items-center gap-2 rounded-3xl bg-emerald-100 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                        <span>✓</span>
                        <span>{selectedCandidate.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayItems
                      .sort((a, b) => b.votes - a.votes)
                      .map((candidate) => {
                        const isSelected = selectedCandidates[position] === candidate.id;
                        return (
                          <div key={candidate.id} className="relative">
                            {isFavorite(candidate.id) && (
                              <button
                                type="button"
                                onClick={() => toggleFavorite(candidate.id)}
                                className="absolute right-3 top-3 z-10 rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow-lg hover:bg-amber-600"
                              >
                                ⭐
                              </button>
                            )}
                            <div className="group relative">
                              <div
                                className={`cursor-pointer transition-all duration-200 ${
                                  isSelected
                                    ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900'
                                    : 'hover:ring-1 hover:ring-slate-300 dark:hover:ring-slate-600'
                                }`}
                                onClick={() => canVote && selectCandidateForPosition(position, candidate.id)}
                              >
                                <CandidateCard
                                  candidate={candidate}
                                  highlight={false}
                                  actionLabel=""
                                  onAction={() => {}}
                                  onView={openCandidate}
                                />
                              </div>
                              {canVote && (
                                <button
                                  type="button"
                                  onClick={() => selectCandidateForPosition(position, candidate.id)}
                                  className={`absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-bold transition ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-900/70 text-white hover:bg-slate-800'
                                  }`}
                                >
                                  {isSelected ? 'Selected' : 'Select'}
                                </button>
                              )}
                              {!isFavorite(candidate.id) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(candidate.id);
                                  }}
                                  className="absolute right-3 top-3 rounded-full bg-slate-900/70 px-2 py-1 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
                                >
                                  ⭐
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bulk Confirm Button - Fixed position at bottom */}
          <div className="sticky bottom-0 -mx-8 -mb-8 mt-8 rounded-b-4xl border-t border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Selected: {getTotalSelectedPositions()} / {getTotalPositions()} positions
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  All votes will be saved together • 24-hour cooldown after voting
                </p>
              </div>
              <button
                type="button"
                onClick={handleBulkVote}
                disabled={submitting || !canVote || getTotalSelectedPositions() === 0}
                className="rounded-3xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
              >
                {submitting ? 'Saving Votes...' : `Confirm All Votes (${getTotalSelectedPositions()})`}
              </button>
            </div>
          </div>
        </>
      )}

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
  );
}
