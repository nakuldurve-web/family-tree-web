'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Submission {
  id: number;
  type: string;
  person_name: string;
  person_full_name: string;
  parent_id: string;
  spouse_of: string;
  image_url: string;
  link_url: string;
  link_description: string;
  tooltip: string;
  submitter_name: string;
  submitter_email: string;
  notes: string;
  status: string;
  submitted_at: string;
}

interface Person {
  id: string;
  full_name: string;
  parent_id: string | null;
  tooltip: string;
  image_url: string;
  status: string;
}

interface Link {
  id: number;
  person_id: string;
  url: string;
  description: string;
  display_html: string;
}

type Tab = 'submissions' | 'people' | 'links';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('submissions');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPeople, setSearchPeople] = useState('');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editForm, setEditForm] = useState<Partial<Person>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // New person form
  const [newPerson, setNewPerson] = useState({
    id: '', full_name: '', parent_id: '', tooltip: '', image_url: '',
  });
  const [addingPerson, setAddingPerson] = useState(false);

  // New link form
  const [newLink, setNewLink] = useState({ person_id: '', url: '', description: '', display_html: '' });
  const [addingLink, setAddingLink] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, pplRes, lnkRes] = await Promise.all([
        fetch('/api/admin/submissions'),
        fetch('/api/admin/people'),
        fetch('/api/admin/links'),
      ]);

      if (subRes.status === 401 || pplRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      const [subData, pplData, lnkData] = await Promise.all([
        subRes.json() as Promise<{ submissions: Submission[] }>,
        pplRes.json() as Promise<{ people: Person[] }>,
        lnkRes.json() as Promise<{ links: Link[] }>,
      ]);

      setSubmissions(subData.submissions ?? []);
      setPeople(pplData.people ?? []);
      setLinks(lnkData.links ?? []);
    } catch {
      showToast('Failed to load data', false);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleSubmissionAction(id: number, action: 'approve' | 'reject') {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        showToast(`Submission ${action}d successfully`, true);
        await fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast((err as { error?: string }).error ?? `Failed to ${action}`, false);
      }
    } catch {
      showToast('Network error', false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSavePerson() {
    if (!editingPerson) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/people/${editingPerson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        showToast('Person updated', true);
        setEditingPerson(null);
        await fetchAll();
      } else {
        showToast('Failed to update', false);
      }
    } catch {
      showToast('Network error', false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeletePerson(id: string) {
    if (!confirm(`Delete person "${id}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/people/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Person deleted', true);
        await fetchAll();
      } else {
        showToast('Failed to delete', false);
      }
    } catch {
      showToast('Network error', false);
    }
  }

  async function handleAddPerson(e: React.FormEvent) {
    e.preventDefault();
    setAddingPerson(true);
    try {
      const res = await fetch('/api/admin/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPerson),
      });
      if (res.ok) {
        showToast('Person added', true);
        setNewPerson({ id: '', full_name: '', parent_id: '', tooltip: '', image_url: '' });
        await fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast((err as { error?: string }).error ?? 'Failed to add person', false);
      }
    } catch {
      showToast('Network error', false);
    } finally {
      setAddingPerson(false);
    }
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    setAddingLink(true);
    try {
      const res = await fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink),
      });
      if (res.ok) {
        showToast('Link added', true);
        setNewLink({ person_id: '', url: '', description: '', display_html: '' });
        await fetchAll();
      } else {
        showToast('Failed to add link', false);
      }
    } catch {
      showToast('Network error', false);
    } finally {
      setAddingLink(false);
    }
  }

  async function handleDeleteLink(id: number) {
    if (!confirm('Delete this link?')) return;
    try {
      const res = await fetch(`/api/admin/links?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Link deleted', true);
        await fetchAll();
      } else {
        showToast('Failed to delete link', false);
      }
    } catch {
      showToast('Network error', false);
    }
  }

  const filteredPeople = people.filter(
    (p) =>
      p.id.toLowerCase().includes(searchPeople.toLowerCase()) ||
      p.full_name.toLowerCase().includes(searchPeople.toLowerCase())
  );

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'submissions', label: 'Submissions', count: pendingSubmissions.length },
    { key: 'people', label: 'People', count: people.length },
    { key: 'links', label: 'Links', count: links.length },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all',
            toast.ok ? 'bg-green-600' : 'bg-red-600'
          )}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-tan-800">Admin Dashboard</h1>
        <button
          onClick={() => {
            fetch('/api/admin/login', { method: 'DELETE' }).finally(() =>
              router.push('/admin/login')
            );
          }}
          className="text-sm text-tan-600 hover:text-tan-800 underline"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-tan-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
              activeTab === t.key
                ? 'border-tan-700 text-tan-800 bg-tan-50'
                : 'border-transparent text-tan-500 hover:text-tan-700'
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  'ml-2 text-xs px-1.5 py-0.5 rounded-full',
                  activeTab === t.key ? 'bg-tan-200 text-tan-800' : 'bg-tan-100 text-tan-600'
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-tan-300 border-t-tan-700" />
        </div>
      ) : (
        <>
          {/* SUBMISSIONS TAB */}
          {activeTab === 'submissions' && (
            <div>
              <h2 className="text-xl font-semibold text-tan-700 mb-4">
                Pending Submissions ({pendingSubmissions.length})
              </h2>
              {pendingSubmissions.length === 0 ? (
                <div className="text-center py-16 text-tan-500">
                  <span className="text-4xl block mb-3">✅</span>
                  No pending submissions
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white border border-tan-200 rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wide bg-tan-100 text-tan-700 px-2 py-0.5 rounded">
                              {sub.type}
                            </span>
                            <span className="text-xs text-tan-400">{sub.submitted_at}</span>
                          </div>
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                            {sub.person_name && (
                              <div>
                                <dt className="text-tan-500 inline">Short ID: </dt>
                                <dd className="inline font-medium">{sub.person_name}</dd>
                              </div>
                            )}
                            {sub.person_full_name && (
                              <div>
                                <dt className="text-tan-500 inline">Full name: </dt>
                                <dd className="inline font-medium">{sub.person_full_name}</dd>
                              </div>
                            )}
                            {sub.parent_id && (
                              <div>
                                <dt className="text-tan-500 inline">Parent: </dt>
                                <dd className="inline">{sub.parent_id}</dd>
                              </div>
                            )}
                            {sub.spouse_of && (
                              <div>
                                <dt className="text-tan-500 inline">Spouse of: </dt>
                                <dd className="inline">{sub.spouse_of}</dd>
                              </div>
                            )}
                            {sub.link_url && (
                              <div className="sm:col-span-2">
                                <dt className="text-tan-500 inline">Link: </dt>
                                <dd className="inline break-all text-blue-600">{sub.link_url}</dd>
                                {sub.link_description && <span className="text-tan-400"> — {sub.link_description}</span>}
                              </div>
                            )}
                            {sub.tooltip && (
                              <div className="sm:col-span-2">
                                <dt className="text-tan-500 inline">Tooltip: </dt>
                                <dd className="inline">{sub.tooltip}</dd>
                              </div>
                            )}
                            {sub.notes && (
                              <div className="sm:col-span-2">
                                <dt className="text-tan-500 inline">Notes: </dt>
                                <dd className="inline italic">{sub.notes}</dd>
                              </div>
                            )}
                            {sub.submitter_name && (
                              <div>
                                <dt className="text-tan-500 inline">From: </dt>
                                <dd className="inline">{sub.submitter_name} {sub.submitter_email ? `<${sub.submitter_email}>` : ''}</dd>
                              </div>
                            )}
                            {sub.image_url && (
                              <div className="sm:col-span-2 flex items-center gap-2">
                                <dt className="text-tan-500">Image:</dt>
                                <img
                                  src={sub.image_url}
                                  alt="submission"
                                  className="h-12 w-12 rounded object-cover border border-tan-200"
                                />
                              </div>
                            )}
                          </dl>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleSubmissionAction(sub.id, 'approve')}
                            disabled={actionLoading === sub.id}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-200 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {actionLoading === sub.id ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleSubmissionAction(sub.id, 'reject')}
                            disabled={actionLoading === sub.id}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-red-200 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {actionLoading === sub.id ? '…' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show recent resolved */}
              {submissions.filter((s) => s.status !== 'pending').length > 0 && (
                <details className="mt-8">
                  <summary className="cursor-pointer text-sm text-tan-500 hover:text-tan-700">
                    Show resolved submissions ({submissions.filter((s) => s.status !== 'pending').length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {submissions
                      .filter((s) => s.status !== 'pending')
                      .map((sub) => (
                        <div key={sub.id} className="bg-tan-50 border border-tan-200 rounded-lg p-3 text-sm text-tan-600">
                          <span className={cn(
                            'text-xs font-semibold uppercase mr-2 px-1.5 py-0.5 rounded',
                            sub.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          )}>
                            {sub.status}
                          </span>
                          [{sub.type}] {sub.person_full_name || sub.link_url || sub.notes} — {sub.submitted_at}
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-tan-700">People ({people.length})</h2>
              </div>

              {/* Add person form */}
              <details className="mb-6 bg-white border border-tan-200 rounded-xl p-4">
                <summary className="cursor-pointer font-medium text-tan-700 hover:text-tan-900">
                  + Add new person directly
                </summary>
                <form onSubmit={handleAddPerson} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'id', label: 'Short ID (unique)', placeholder: 'e.g. john_doe', required: true },
                    { key: 'full_name', label: 'Full Name', placeholder: 'John Doe', required: true },
                    { key: 'parent_id', label: 'Parent ID', placeholder: 'Leave blank for root' },
                    { key: 'image_url', label: 'Image URL', placeholder: 'https://...' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-tan-600 mb-1">{f.label}</label>
                      <input
                        type="text"
                        required={f.required}
                        placeholder={f.placeholder}
                        value={(newPerson as Record<string, string>)[f.key]}
                        onChange={(e) => setNewPerson((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-tan-600 mb-1">Tooltip</label>
                    <textarea
                      rows={2}
                      value={newPerson.tooltip}
                      onChange={(e) => setNewPerson((prev) => ({ ...prev, tooltip: e.target.value }))}
                      className="w-full border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={addingPerson}
                      className="bg-tan-700 hover:bg-tan-600 disabled:bg-tan-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {addingPerson ? 'Adding…' : 'Add Person'}
                    </button>
                  </div>
                </form>
              </details>

              {/* Search */}
              <input
                type="search"
                placeholder="Search by ID or name…"
                value={searchPeople}
                onChange={(e) => setSearchPeople(e.target.value)}
                className="w-full border border-tan-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-tan-400"
              />

              {/* Editing modal */}
              {editingPerson && (
                <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                    <h3 className="text-lg font-bold text-tan-800 mb-4">Edit: {editingPerson.id}</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'full_name', label: 'Full Name' },
                        { key: 'parent_id', label: 'Parent ID' },
                        { key: 'image_url', label: 'Image URL' },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="block text-xs font-medium text-tan-600 mb-1">{f.label}</label>
                          <input
                            type="text"
                            value={(editForm as Record<string, string | null>)[f.key] as string ?? ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                            className="w-full border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-medium text-tan-600 mb-1">Tooltip</label>
                        <textarea
                          rows={3}
                          value={(editForm.tooltip as string) ?? ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, tooltip: e.target.value }))}
                          className="w-full border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-tan-600 mb-1">Status</label>
                        <select
                          value={(editForm.status as string) ?? 'approved'}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                          className="w-full border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
                        >
                          <option value="approved">approved</option>
                          <option value="hidden">hidden</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={handleSavePerson}
                        disabled={savingEdit}
                        className="bg-tan-700 hover:bg-tan-600 disabled:bg-tan-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {savingEdit ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingPerson(null)}
                        className="border border-tan-300 text-tan-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-tan-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* People list */}
              <div className="overflow-x-auto rounded-xl border border-tan-200">
                <table className="w-full text-sm">
                  <thead className="bg-tan-100 text-tan-700">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">ID</th>
                      <th className="px-4 py-2 text-left font-semibold">Full Name</th>
                      <th className="px-4 py-2 text-left font-semibold">Parent</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                      <th className="px-4 py-2 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tan-100">
                    {filteredPeople.map((p) => (
                      <tr key={p.id} className="hover:bg-tan-50 transition-colors">
                        <td className="px-4 py-2 font-mono text-xs text-tan-700">{p.id}</td>
                        <td className="px-4 py-2">{p.full_name}</td>
                        <td className="px-4 py-2 font-mono text-xs text-tan-500">{p.parent_id ?? '—'}</td>
                        <td className="px-4 py-2">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            p.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          )}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 flex gap-2">
                          <button
                            onClick={() => {
                              setEditingPerson(p);
                              setEditForm({ full_name: p.full_name, parent_id: p.parent_id ?? '', tooltip: p.tooltip, image_url: p.image_url, status: p.status });
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePerson(p.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LINKS TAB */}
          {activeTab === 'links' && (
            <div>
              <h2 className="text-xl font-semibold text-tan-700 mb-4">Links ({links.length})</h2>

              {/* Add link form */}
              <details className="mb-6 bg-white border border-tan-200 rounded-xl p-4">
                <summary className="cursor-pointer font-medium text-tan-700 hover:text-tan-900">
                  + Add new link
                </summary>
                <form onSubmit={handleAddLink} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-tan-600 mb-1">Person ID</label>
                    <select
                      required
                      value={newLink.person_id}
                      onChange={(e) => setNewLink((p) => ({ ...p, person_id: e.target.value }))}
                      className="w-full border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
                    >
                      <option value="">Select person…</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>{p.id} — {p.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-tan-600 mb-1">URL</label>
                    <input
                      type="url"
                      required
                      value={newLink.url}
                      onChange={(e) => setNewLink((p) => ({ ...p, url: e.target.value }))}
                      className="w-full border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-tan-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={newLink.description}
                      onChange={(e) => setNewLink((p) => ({ ...p, description: e.target.value }))}
                      className="w-full border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-tan-600 mb-1">Display HTML (optional)</label>
                    <input
                      type="text"
                      value={newLink.display_html}
                      onChange={(e) => setNewLink((p) => ({ ...p, display_html: e.target.value }))}
                      className="w-full border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={addingLink}
                      className="bg-tan-700 hover:bg-tan-600 disabled:bg-tan-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {addingLink ? 'Adding…' : 'Add Link'}
                    </button>
                  </div>
                </form>
              </details>

              <div className="overflow-x-auto rounded-xl border border-tan-200">
                <table className="w-full text-sm">
                  <thead className="bg-tan-100 text-tan-700">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">ID</th>
                      <th className="px-4 py-2 text-left font-semibold">Person</th>
                      <th className="px-4 py-2 text-left font-semibold">URL</th>
                      <th className="px-4 py-2 text-left font-semibold">Description</th>
                      <th className="px-4 py-2 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tan-100">
                    {links.map((l) => (
                      <tr key={l.id} className="hover:bg-tan-50 transition-colors">
                        <td className="px-4 py-2 text-tan-500">{l.id}</td>
                        <td className="px-4 py-2 font-mono text-xs">{l.person_id}</td>
                        <td className="px-4 py-2 max-w-xs truncate">
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {l.url}
                          </a>
                        </td>
                        <td className="px-4 py-2 text-tan-600">{l.description}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleDeleteLink(l.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
