import React, { useEffect, useMemo, useState } from 'react';
import ImageUploadDropzone from '../components/ImageUploadDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { Candidate, SystemSettings } from '../types';
import {
  createCandidate,
  deleteCandidate,
  fetchActiveVoterCount,
  fetchSystemSettings,
  fetchVotesTodayCount,
  saveSystemSettings,
  subscribeCandidates,
  subscribeSettings,
  updateCandidate,
  uploadCandidateImage,
} from '../services/votingService';
import { resizeImageFile } from '../utils/imageUtils';

const EMPTY_FORM = { name: '', position: '', manifesto: '', imageFile: null as File | null, imageUrl: '' };

export default function AdminPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ votingOpen: true, resultsVisible: false, cooldownHours: 24 });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeVoters, setActiveVoters] = useState(0);
  const [votesToday, setVotesToday] = useState(0);
  const [showReveal, setShowReveal] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(3);

  useEffect(() => {
    const unsubscribe = subscribeCandidates((items) => {
      setCandidates(items);
      setLoading(false);
    });
    const unsubscribeSettings = subscribeSettings((value) => setSettings(value));

    async function loadAnalytics() {
      setActiveVoters(await fetchActiveVoterCount());
      setVotesToday(await fetchVotesTodayCount());
    }

    loadAnalytics();

    return () => {
      unsubscribe();
      unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    if (!selectedCandidate) return;
    setForm({
      name: selectedCandidate.name,
      position: selectedCandidate.position,
      manifesto: selectedCandidate.manifesto ?? '',
      imageFile: null,
      imageUrl: selectedCandidate.imageUrl,
    });
  }, [selectedCandidate]);

  const grouped = useMemo(() => {
    return candidates.reduce<Record<string, Candidate[]>>((acc: Record<string, Candidate[]>, item: Candidate) => {
      acc[item.position] = acc[item.position] ?? [];
      acc[item.position].push(item);
      return acc;
    }, {});
  }, [candidates]);

  const totalVotes = useMemo(() => candidates.reduce((sum, candidate) => sum + candidate.votes, 0), [candidates]);

  const handleFormChange = (field: keyof typeof form, value: string | File | null) => {
    setForm((current: typeof form) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setSelectedCandidate(null);
    setForm(EMPTY_FORM);
    setStatus(null);
  };

  const handleSave = async () => {
    if (!form.name || !form.position) {
      setStatus('Fill in name and position.');
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const candidateData = {
        name: form.name,
        position: form.position,
        manifesto: form.manifesto,
        imageUrl: form.imageUrl,
      };

      if (selectedCandidate) {
        let imageUrl = form.imageUrl;
        let imagePath = selectedCandidate.imagePath;

        if (form.imageFile) {
          const resizedBlob = await resizeImageFile(form.imageFile);
          const uploadResult = await uploadCandidateImage(selectedCandidate.id, resizedBlob, form.imageFile.name);
          imageUrl = uploadResult.url;
          imagePath = uploadResult.storagePath;
        }

        await updateCandidate(selectedCandidate.id, { ...candidateData, imageUrl, imagePath });
        setStatus('Candidate updated successfully.');
      } else {
        if (!form.imageFile) {
          setStatus('Select a candidate image before adding.');
          setSaving(false);
          return;
        }
        const resizedBlob = await resizeImageFile(form.imageFile);
        const candidateId = await createCandidate({ ...candidateData, imageUrl: '', imagePath: '' });
        const uploadResult = await uploadCandidateImage(candidateId, resizedBlob, form.imageFile.name);
        await updateCandidate(candidateId, { imageUrl: uploadResult.url, imagePath: uploadResult.storagePath });
        setStatus('Candidate created successfully.');
      }
      resetForm();
    } catch (error) {
      setStatus((error as Error).message || 'Unable to save candidate.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (candidateId: string) => {
    if (!window.confirm('Delete this candidate?')) return;
    setSaving(true);
    try {
      await deleteCandidate(candidateId);
      setStatus('Candidate deleted successfully.');
      if (selectedCandidate?.id === candidateId) resetForm();
    } catch (error) {
      setStatus((error as Error).message || 'Unable to delete candidate.');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsSave = async () => {
    setSaving(true);
    try {
      await saveSystemSettings(settings);
      setStatus('System settings updated.');
    } catch (error) {
      setStatus((error as Error).message || 'Unable to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = ['Name', 'Position', 'Manifesto', 'Votes', 'Image URL', 'Created At'];
    const rows = candidates.map((candidate) => [
      candidate.name,
      candidate.position,
      candidate.manifesto ?? '',
      String(candidate.votes),
      candidate.imageUrl,
      new Date(candidate.createdAt).toISOString(),
    ]);
    const csvContent = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'candidate_results.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write('<html><head><title>Candidate Results</title>');
    printWindow.document.write('<style>body{font-family:sans-serif;padding:24px;color:#0f172a;} h1{font-size:24px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #cbd5e1;padding:12px;text-align:left;} th{background:#f8fafc;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Candidate Results</h1>');
    printWindow.document.write('<table><thead><tr><th>Name</th><th>Position</th><th>Votes</th><th>Image URL</th></tr></thead><tbody>');
    candidates.forEach((candidate) => {
      printWindow?.document.write(`<tr><td>${candidate.name}</td><td>${candidate.position}</td><td>${candidate.votes}</td><td>${candidate.imageUrl}</td></tr>`);
    });
    printWindow.document.write('</tbody></table>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleRevealResults = () => {
    setShowReveal(true);
    setRevealCountdown(3);
    const interval = window.setInterval(() => {
      setRevealCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const winner = candidates.slice().sort((a, b) => b.votes - a.votes)[0];

  const totalVotesToday = votesToday;
  const mostVoted = winner?.name ?? 'None';

  const closeReveal = () => {
    setShowReveal(false);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Admin panel</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Candidate and system management</h1>
          </div>
          <div className="rounded-3xl bg-slate-100 px-4 py-3 text-slate-700">
            Voting {settings.votingOpen ? 'Open' : 'Closed'} • Results {settings.resultsVisible ? 'Shown' : 'Hidden'}
          </div>
        </div>
      </section>

      {status ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm">{status}</div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft">
            <h2 className="text-2xl font-semibold text-slate-900">Add / edit candidate</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleFormChange('name', event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Position</span>
                <input
                  type="text"
                  value={form.position}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleFormChange('position', event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
                />
              </label>
            </div>
            <label className="mt-6 block">
              <span className="text-sm font-medium text-slate-700">Manifesto</span>
              <textarea
                value={form.manifesto}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleFormChange('manifesto', event.target.value)}
                className="mt-2 h-32 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
              />
            </label>
            <div className="mt-6">
              <ImageUploadDropzone
                label="Candidate image"
                initialPreview={form.imageUrl}
                onFileChange={(file) => handleFormChange('imageFile', file)}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {selectedCandidate ? 'Update candidate' : 'Create candidate'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Reset
              </button>
            </div>
          </section>

          <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">System settings</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={settings.votingOpen}
                  onChange={(event) => setSettings((prev) => ({ ...prev, votingOpen: event.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-slate-900 dark:border-slate-600"
                />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Voting open</span>
              </label>
              <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={settings.resultsVisible}
                  onChange={(event) => setSettings((prev) => ({ ...prev, resultsVisible: event.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-slate-900 dark:border-slate-600"
                />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Show results</span>
              </label>
            </div>
            <div className="mt-5">
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">Cooldown hours</label>
              <input
                type="number"
                min={1}
                value={settings.cooldownHours}
                onChange={(event) => setSettings((prev) => ({ ...prev, cooldownHours: Number(event.target.value) }))}
                className="mt-2 w-32 rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={handleSettingsSave}
              disabled={saving}
              className="mt-6 rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Save settings
            </button>
          </section>
        </div>

        <section className="space-y-6">
          <div className="grid gap-6">
            <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Analytics</h2>
                  <p className="mt-1 text-sm text-slate-500">Get an instant view of system activity.</p>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">{candidates.length} candidates</div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Total votes</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{totalVotes}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Votes today</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{votesToday}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Active voters</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{activeVoters}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Top candidate</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{winner?.name || 'None'}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Results reveal</h2>
                  <p className="mt-1 text-sm text-slate-500">Create a dramatic winner reveal experience.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRevealResults}
                  className="rounded-3xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                >
                  Reveal results
                </button>
              </div>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p><strong>QR code access</strong> for instant voting.</p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/vote')}`}
                  alt="Vote QR code"
                  className="mt-4 mx-auto rounded-3xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>
          <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Candidates</h2>
                <p className="mt-1 text-sm text-slate-500">Manage all candidates and track votes.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">{candidates.length} candidates</span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">{totalVotes} total votes</span>
              </div>
            </div>

            {loading ? (
            <LoadingSpinner />
          ) : candidates.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">No candidates yet.</div>
          ) : (
            <div className="mt-6 space-y-6">
              {Object.entries(grouped).map(([position, items]) => (
                <div key={position} className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">{position}</h3>
                  <div className="grid gap-4">
                    {items.map((candidate) => (
                      <div key={candidate.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="h-28 w-28 overflow-hidden rounded-3xl bg-slate-200 sm:flex-shrink-0">
                          {candidate.imageUrl ? (
                            <img src={candidate.imageUrl} alt={candidate.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xl font-semibold text-slate-900">{candidate.name}</p>
                          <p className="mt-1 text-sm text-slate-600">{candidate.manifesto || 'No manifesto provided.'}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-700">
                            <span className="rounded-full bg-white px-3 py-1 shadow-sm">Votes: {candidate.votes}</span>
                            <span className="rounded-full bg-white px-3 py-1 shadow-sm">Position: {candidate.position}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedCandidate(candidate)}
                            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(candidate.id)}
                            className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
      </div>
      {showReveal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-6 text-white">
          <div className="w-full max-w-3xl space-y-6 rounded-[2rem] border border-amber-400 bg-slate-950/95 p-8 shadow-2xl">
            <div className="rounded-4xl border border-amber-500/40 bg-slate-900/90 p-6 text-center">
              <p className="text-sm uppercase tracking-[0.32em] text-amber-300">Results reveal</p>
              <p className="mt-3 text-6xl font-bold text-white">{revealCountdown > 0 ? revealCountdown : '🎉'}</p>
              <p className="mt-4 text-sm text-slate-400">Get ready for the winner announcement.</p>
            </div>
            {revealCountdown === 0 ? (
              <div className="rounded-4xl border border-emerald-500/40 bg-emerald-950/90 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.32em] text-emerald-300">Winner</p>
                <p className="mt-3 text-4xl font-bold text-white">{winner?.name || 'No winner yet'}</p>
                <p className="mt-2 text-sm text-slate-400">{winner?.position || ''}</p>
                <p className="mt-4 text-2xl font-semibold text-amber-300">{winner?.votes} votes</p>
                <div className="mt-6 text-sm text-slate-400">Confetti mode activated!</div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={closeReveal}
              className="mx-auto mt-4 rounded-3xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
            >
              Close Reveal
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
