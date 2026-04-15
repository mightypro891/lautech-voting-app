import { Candidate } from '../types';

interface CandidateProfileModalProps {
  candidate: Candidate;
  isOpen: boolean;
  isVoting: boolean;
  canVote: boolean;
  onClose: () => void;
  onVote: (id: string) => void;
}

export default function CandidateProfileModal({
  candidate,
  isOpen,
  isVoting,
  canVote,
  onClose,
  onVote,
}: CandidateProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm dark:bg-slate-950/85">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="relative overflow-hidden">
          <img src={candidate.imageUrl} alt={candidate.name} className="h-72 w-full object-cover" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-2 text-sm text-slate-900 transition hover:bg-white dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <div className="space-y-4 p-6 text-slate-900 dark:text-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">{candidate.position}</p>
              <h2 className="mt-2 text-3xl font-semibold dark:text-slate-100">{candidate.name}</h2>
            </div>
            <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-200">
              {candidate.votes} votes
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
            {candidate.manifesto || 'No manifesto has been added for this candidate yet.'}
          </div>
          <button
            type="button"
            onClick={() => onVote(candidate.id)}
            disabled={!canVote || isVoting}
            className="w-full rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isVoting ? 'Submitting...' : canVote ? 'Cast vote' : 'Voting locked'}
          </button>
        </div>
      </div>
    </div>
  );
}
