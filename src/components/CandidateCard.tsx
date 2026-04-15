import { Candidate } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
  actionLabel?: string;
  onAction?: (id: string) => void;
  onView?: (candidate: Candidate) => void;
  showVotes?: boolean;
  highlight?: boolean;
}

export default function CandidateCard({
  candidate,
  actionLabel,
  onAction,
  onView,
  showVotes = true,
  highlight = false,
}: CandidateCardProps) {
  return (
    <article className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition duration-300 dark:border-slate-700 dark:bg-slate-900 ${highlight ? 'ring-2 ring-amber-400/80 shadow-xl dark:ring-amber-500/60' : 'hover:-translate-y-0.5 hover:shadow-lg'}`}>
      <div
        onClick={() => onView?.(candidate)}
        role={onView ? 'button' : undefined}
        tabIndex={onView ? 0 : undefined}
        className="group grid w-full cursor-pointer text-left"
      >
        <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img src={candidate.imageUrl} alt={candidate.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{candidate.position}</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">{candidate.name}</h3>
          {candidate.manifesto ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{candidate.manifesto}</p> : null}
          {showVotes ? (
            <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">Votes: {candidate.votes}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 px-5 pb-5 sm:px-6">
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAction(candidate.id);
            }}
            className="inline-flex w-full justify-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            {actionLabel}
          </button>
        ) : null}
        {onView ? (
          <button
            type="button"
            onClick={() => onView(candidate)}
            className="inline-flex w-full justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            View profile
          </button>
        ) : null}
      </div>
    </article>
  );
}
