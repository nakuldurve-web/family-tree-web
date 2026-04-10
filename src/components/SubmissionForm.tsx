'use client';

import { useState, useEffect, useRef } from 'react';

interface Person {
  id: string;
  full_name: string;
}

type Tab = 'person' | 'link' | 'correction';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function SubmissionForm() {
  const [activeTab, setActiveTab] = useState<Tab>('person');
  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Person form state
  const [personForm, setPersonForm] = useState({
    person_name: '',
    person_full_name: '',
    parent_id: '',
    spouse_of: '',
    tooltip: '',
    image_url: '',
    submitter_name: '',
    submitter_email: '',
    notes: '',
  });

  // Link form state
  const [linkForm, setLinkForm] = useState({
    person_id: '',
    link_url: '',
    link_description: '',
    submitter_name: '',
    submitter_email: '',
  });

  // Correction form state
  const [correctionForm, setCorrectionForm] = useState({
    person_id: '',
    notes: '',
    submitter_name: '',
    submitter_email: '',
  });

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/tree')
      .then((r) => r.json() as Promise<{ people?: Person[] }>)
      .then((d) => setPeople(d.people ?? []))
      .catch(() => {});
  }, []);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      const res = await fetch('/api/upload', { method: 'PUT', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json() as { url: string };
      return url;
    } catch {
      setStatus({ ok: false, msg: 'Image upload failed. Please try again.' });
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  async function submitPerson(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    let imageUrl = personForm.image_url;
    if (imageFile && !imageUrl) {
      const uploaded = await uploadImage();
      if (!uploaded) { setSubmitting(false); return; }
      imageUrl = uploaded;
    }

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'person', ...personForm, image_url: imageUrl }),
      });
      if (res.ok) {
        setStatus({ ok: true, msg: 'Submission received! It will appear after admin review.' });
        setPersonForm({ person_name: '', person_full_name: '', parent_id: '', spouse_of: '', tooltip: '', image_url: '', submitter_name: '', submitter_email: '', notes: '' });
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const err = await res.json().catch(() => ({}));
        setStatus({ ok: false, msg: (err as { error?: string }).error ?? 'Submission failed. Please try again.' });
      }
    } catch {
      setStatus({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'link', ...linkForm }),
      });
      if (res.ok) {
        setStatus({ ok: true, msg: 'Link submission received! It will appear after admin review.' });
        setLinkForm({ person_id: '', link_url: '', link_description: '', submitter_name: '', submitter_email: '' });
      } else {
        setStatus({ ok: false, msg: 'Submission failed. Please try again.' });
      }
    } catch {
      setStatus({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCorrection(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'correction', ...correctionForm }),
      });
      if (res.ok) {
        setStatus({ ok: true, msg: 'Correction report received! Thank you.' });
        setCorrectionForm({ person_id: '', notes: '', submitter_name: '', submitter_email: '' });
      } else {
        setStatus({ ok: false, msg: 'Submission failed. Please try again.' });
      }
    } catch {
      setStatus({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'person', label: 'Add a Person', icon: '👤' },
    { key: 'link', label: 'Add a Link', icon: '🔗' },
    { key: 'correction', label: 'Report a Correction', icon: '✏️' },
  ];

  const inputClass =
    'w-full border border-tan-300 rounded-lg px-3 py-2 text-sm text-tan-900 focus:outline-none focus:ring-2 focus:ring-tan-400 focus:border-transparent bg-white';
  const labelClass = 'block text-sm font-medium text-tan-700 mb-1';
  const sectionLabel = 'text-xs font-semibold text-tan-500 uppercase tracking-wider mb-3 mt-5 block';

  return (
    <div className="bg-white border border-tan-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-tan-200 bg-tan-50">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setStatus(null); }}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
              activeTab === t.key
                ? 'bg-white text-tan-800 border-b-2 border-tan-700'
                : 'text-tan-500 hover:text-tan-700'
            )}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {status && (
          <div
            className={cn(
              'mb-5 px-4 py-3 rounded-lg text-sm font-medium',
              status.ok
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            )}
          >
            {status.ok ? '✅ ' : '❌ '}{status.msg}
          </div>
        )}

        {/* ADD A PERSON */}
        {activeTab === 'person' && (
          <form onSubmit={submitPerson} className="space-y-4">
            <p className="text-sm text-tan-600">
              Fill in as much detail as you know. The admin will review and verify before publishing.
            </p>

            <span className={sectionLabel}>Person Details</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Short ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={personForm.person_name}
                  onChange={(e) => setPersonForm((p) => ({ ...p, person_name: e.target.value }))}
                  placeholder="e.g. john_doe (unique, no spaces)"
                  className={inputClass}
                />
                <p className="text-xs text-tan-400 mt-1">A short unique identifier (lowercase, underscores ok)</p>
              </div>
              <div>
                <label className={labelClass}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={personForm.person_full_name}
                  onChange={(e) => setPersonForm((p) => ({ ...p, person_full_name: e.target.value }))}
                  placeholder="e.g. John Michael Doe"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Parent</label>
                <select
                  value={personForm.parent_id}
                  onChange={(e) => setPersonForm((p) => ({ ...p, parent_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">— root / unknown —</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Spouse of</label>
                <select
                  value={personForm.spouse_of}
                  onChange={(e) => setPersonForm((p) => ({ ...p, spouse_of: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">— not a spouse entry —</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Tooltip / Bio</label>
              <textarea
                rows={3}
                value={personForm.tooltip}
                onChange={(e) => setPersonForm((p) => ({ ...p, tooltip: e.target.value }))}
                placeholder="Short bio, dates, or notes that appear on hover…"
                className={inputClass}
              />
            </div>

            <span className={sectionLabel}>Photo</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className={labelClass}>Upload photo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full text-sm text-tan-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-tan-100 file:text-tan-700 hover:file:bg-tan-200 cursor-pointer"
                />
                {uploadingImage && (
                  <p className="text-xs text-tan-500 mt-1">Uploading…</p>
                )}
              </div>
              {imagePreview && (
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-20 rounded-full object-cover border-2 border-tan-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Or paste image URL</label>
              <input
                type="url"
                value={personForm.image_url}
                onChange={(e) => setPersonForm((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="https://…"
                className={inputClass}
              />
            </div>

            <span className={sectionLabel}>Your Info (optional)</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Your name</label>
                <input
                  type="text"
                  value={personForm.submitter_name}
                  onChange={(e) => setPersonForm((p) => ({ ...p, submitter_name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Your email</label>
                <input
                  type="email"
                  value={personForm.submitter_email}
                  onChange={(e) => setPersonForm((p) => ({ ...p, submitter_email: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Additional notes</label>
              <textarea
                rows={2}
                value={personForm.notes}
                onChange={(e) => setPersonForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Anything else the admin should know…"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="w-full bg-tan-700 hover:bg-tan-600 disabled:bg-tan-300 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              {submitting ? 'Submitting…' : 'Submit Person for Review'}
            </button>
          </form>
        )}

        {/* ADD A LINK */}
        {activeTab === 'link' && (
          <form onSubmit={submitLink} className="space-y-4">
            <p className="text-sm text-tan-600">
              Add an external link (article, photo album, memorial page, etc.) associated with a family member.
            </p>

            <div>
              <label className={labelClass}>
                Person <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={linkForm.person_id}
                onChange={(e) => setLinkForm((p) => ({ ...p, person_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select a person…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={linkForm.link_url}
                onChange={(e) => setLinkForm((p) => ({ ...p, link_url: e.target.value }))}
                placeholder="https://…"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <input
                type="text"
                value={linkForm.link_description}
                onChange={(e) => setLinkForm((p) => ({ ...p, link_description: e.target.value }))}
                placeholder="e.g. Obituary, Wedding album, News article…"
                className={inputClass}
              />
            </div>

            <span className={sectionLabel}>Your Info (optional)</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Your name</label>
                <input
                  type="text"
                  value={linkForm.submitter_name}
                  onChange={(e) => setLinkForm((p) => ({ ...p, submitter_name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Your email</label>
                <input
                  type="email"
                  value={linkForm.submitter_email}
                  onChange={(e) => setLinkForm((p) => ({ ...p, submitter_email: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-tan-700 hover:bg-tan-600 disabled:bg-tan-300 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              {submitting ? 'Submitting…' : 'Submit Link for Review'}
            </button>
          </form>
        )}

        {/* REPORT A CORRECTION */}
        {activeTab === 'correction' && (
          <form onSubmit={submitCorrection} className="space-y-4">
            <p className="text-sm text-tan-600">
              Found a mistake? Let us know and we&apos;ll fix it.
            </p>

            <div>
              <label className={labelClass}>Person (if applicable)</label>
              <select
                value={correctionForm.person_id}
                onChange={(e) => setCorrectionForm((p) => ({ ...p, person_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select a person… (optional)</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Description of correction <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={correctionForm.notes}
                onChange={(e) => setCorrectionForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Describe the error and what the correct information should be…"
                className={inputClass}
              />
            </div>

            <span className={sectionLabel}>Your Info (optional)</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Your name</label>
                <input
                  type="text"
                  value={correctionForm.submitter_name}
                  onChange={(e) => setCorrectionForm((p) => ({ ...p, submitter_name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Your email</label>
                <input
                  type="email"
                  value={correctionForm.submitter_email}
                  onChange={(e) => setCorrectionForm((p) => ({ ...p, submitter_email: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-tan-700 hover:bg-tan-600 disabled:bg-tan-300 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              {submitting ? 'Submitting…' : 'Send Correction Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
