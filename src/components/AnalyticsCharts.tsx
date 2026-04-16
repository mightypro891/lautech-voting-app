import { useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Candidate } from '../types';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface AnalyticsChartsProps {
  candidates: Candidate[];
  totalVotes: number;
}

export default function AnalyticsCharts({ candidates, totalVotes }: AnalyticsChartsProps) {
  const pieRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<ChartJS | null>(null);
  const barChartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!candidates.length) return;

    // Pie Chart - Vote Distribution
    if (pieRef.current) {
      if (pieChartRef.current) pieChartRef.current.destroy();

      pieChartRef.current = new ChartJS(pieRef.current, {
        type: 'pie',
        data: {
          labels: candidates.map((c) => c.name),
          datasets: [
            {
              data: candidates.map((c) => c.votes),
              backgroundColor: [
                '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6',
                '#ec4899', '#06b6d4', '#f97316', '#6366f1',
              ],
              borderColor: '#ffffff',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 12 } } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.formattedValue} votes` } },
          },
        },
      });
    }

    // Bar Chart - Top 5 Candidates
    if (barRef.current) {
      if (barChartRef.current) barChartRef.current.destroy();

      const topCandidates = candidates.sort((a, b) => b.votes - a.votes).slice(0, 5);

      barChartRef.current = new ChartJS(barRef.current, {
        type: 'bar',
        data: {
          labels: topCandidates.map((c) => c.name),
          datasets: [
            {
              label: 'Votes',
              data: topCandidates.map((c) => c.votes),
              backgroundColor: '#3b82f6',
              borderColor: '#1e40af',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          indexAxis: 'y' as const,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } },
        },
      });
    }

    return () => {
      pieChartRef.current?.destroy();
      barChartRef.current?.destroy();
    };
  }, [candidates]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Vote Distribution</h3>
        <canvas ref={pieRef} />
      </div>
      <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Top 5 Candidates</h3>
        <canvas ref={barRef} />
      </div>
    </div>
  );
}
