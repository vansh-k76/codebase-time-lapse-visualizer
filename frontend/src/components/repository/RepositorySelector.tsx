import React, { useState, useEffect } from 'react';
import { useVisualizerStore } from '../../state/store';
import { Plus, GitBranch, FolderOpen, Loader2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export const RepositorySelector: React.FC = () => {
  const {
    repositories,
    activeRepoId,
    fetchRepositories,
    selectRepository,
    connectRepository,
    deleteRepository,
    isLoading,
  } = useVisualizerStore();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRepositories();
    // Set up polling for status updates every 4 seconds
    const interval = setInterval(() => {
      fetchRepositories();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchRepositories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Please provide a project name.');
      return;
    }
    if (!url.trim() && !localPath.trim()) {
      setError('Please provide either a Git URL or a local file path.');
      return;
    }

    setIsSubmitting(true);
    try {
      await connectRepository(
        name.trim(),
        url.trim() || undefined,
        localPath.trim() || undefined
      );
      setName('');
      setUrl('');
      setLocalPath('');
      setIsOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect repository.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-900">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        );
      case 'analyzing':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-blue-950/80 text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-900">
            <Loader2 className="w-3 h-3 animate-spin" /> Analyzing
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-rose-950/80 text-rose-400 font-semibold px-2 py-0.5 rounded-full border border-rose-900">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] bg-slate-950/80 text-slate-400 font-semibold px-2 py-0.5 rounded-full border border-slate-900">
            <Loader2 className="w-3 h-3 animate-pulse" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between border-b border-darkBorder pb-4">
        <h2 className="text-sm font-bold tracking-wide uppercase text-slate-400 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-500" /> Repositories
        </h2>
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
          title="Connect Repo"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Repository List */}
      <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2">
        {repositories.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No repositories connected. Click the plus button to add one.
          </div>
        ) : (
          repositories.map((repo) => (
            <div
              key={repo.id}
              className={`group relative border rounded-xl p-3.5 flex flex-col gap-2 cursor-pointer transition-all hover:bg-slate-800/40 ${
                activeRepoId === repo.id
                  ? 'border-blue-500/80 bg-blue-950/10'
                  : 'border-darkBorder bg-darkCard/40'
              }`}
              onClick={() => repo.status === 'completed' && selectRepository(repo.id)}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-slate-200 group-hover:text-slate-100 truncate pr-6">
                  {repo.name}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this repository analysis?')) {
                      deleteRepository(repo.id);
                    }
                  }}
                  className="absolute top-3.5 right-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded transition-all"
                  title="Delete Repository"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[10px] text-slate-500 font-mono truncate break-all">
                {repo.url || repo.local_path}
              </div>

              <div className="flex items-center justify-between mt-1">
                {getStatusBadge(repo.status)}
                {repo.last_analyzed_at && (
                  <span className="text-[9px] text-slate-500 font-medium">
                    Updated {new Date(repo.last_analyzed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal - Connect New Repo */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-darkCard border border-darkBorder w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" /> Connect Git Repository
            </h3>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Website"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-darkBg border border-darkBorder rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Remote Git URL (HTTPS)</label>
                <input
                  type="text"
                  placeholder="e.g. https://github.com/d3/d3.git"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={!!localPath}
                  className="w-full bg-darkBg border border-darkBorder rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500 disabled:opacity-40 transition-colors"
                />
              </div>

              <div className="flex items-center my-1">
                <div className="h-[1px] bg-slate-800 flex-grow" />
                <span className="text-[10px] text-slate-500 font-semibold px-2 uppercase">Or local</span>
                <div className="h-[1px] bg-slate-800 flex-grow" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" /> Local Repository Path
                </label>
                <input
                  type="text"
                  placeholder="e.g. C:\Users\Username\Projects\my-repo"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  disabled={!!url}
                  className="w-full bg-darkBg border border-darkBorder rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500 disabled:opacity-40 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-rose-950/40 border border-rose-900/60 rounded-lg p-2.5 text-xs text-rose-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setError('');
                  }}
                  className="px-3.5 py-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Connect & Scan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
