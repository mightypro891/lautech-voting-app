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

  useEffect(() => {
    const unsubscribe = subscribeCandidates((items) => {
      setCandidates(items);
      setLoading(false);
    });
    const unsubscribeSettings = subscribeSettings((value) => setSettings(value));
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

          <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft">
            <h2 className="text-2xl font-semibold text-slate-900">System settings</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={settings.votingOpen}
                  onChange={(event) => setSettings((prev) => ({ ...prev, votingOpen: event.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-slate-900"
                />
                <span>Voting open</span>
              </label>
              <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={settings.resultsVisible}
                  onChange={(event) => setSettings((prev) => ({ ...prev, resultsVisible: event.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-slate-900"
                />
                <span>Show results</span>
              </label>
            </div>
            <div className="mt-5">
              <label className="block text-sm font-medium text-slate-700">Cooldown hours</label>
              <input
                type="number"
                min={1}
                value={settings.cooldownHours}
                onChange={(event) => setSettings((prev) => ({ ...prev, cooldownHours: Number(event.target.value) }))}
                className="mt-2 w-32 rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
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
      </div>
    </div>
  );
}
