import type { Repository, Commit, Contributor, DailyMetric, RepositorySummary, FileNode, CommitComplexity, AICommitInsight } from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

export const api = {
  async getRepositories(): Promise<Repository[]> {
    const res = await fetch(`${API_BASE}/repositories/`);
    if (!res.ok) throw new Error('Failed to fetch repositories');
    return res.json();
  },

  async connectRepository(data: { name: string; url?: string; local_path?: string }): Promise<Repository> {
    const res = await fetch(`${API_BASE}/repositories/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to connect repository');
    }
    return res.json();
  },

  async deleteRepository(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/repositories/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete repository');
  },

  async getRepositorySummary(id: number): Promise<RepositorySummary> {
    const res = await fetch(`${API_BASE}/repositories/${id}/summary`);
    if (!res.ok) throw new Error('Failed to fetch repository summary');
    return res.json();
  },

  async getCommits(id: number): Promise<Commit[]> {
    const res = await fetch(`${API_BASE}/repositories/${id}/timeline?limit=5000`);
    if (!res.ok) throw new Error('Failed to fetch commits');
    return res.json();
  },

  async getDailyMetrics(id: number): Promise<DailyMetric[]> {
    const res = await fetch(`${API_BASE}/repositories/${id}/growth`);
    if (!res.ok) throw new Error('Failed to fetch daily metrics');
    return res.json();
  },

  async getContributors(id: number): Promise<Contributor[]> {
    const res = await fetch(`${API_BASE}/repositories/${id}/contributors`);
    if (!res.ok) throw new Error('Failed to fetch contributors');
    return res.json();
  },

  async getFileSnapshot(id: number, commitHash: string): Promise<{ commit: Commit; tree: FileNode }> {
    const res = await fetch(`${API_BASE}/repositories/${id}/file-snapshots?commit_hash=${commitHash}`);
    if (!res.ok) throw new Error('Failed to fetch file snapshot');
    return res.json();
  },

  async getComplexityTimeline(id: number): Promise<CommitComplexity[]> {
    const res = await fetch(`${API_BASE}/repositories/${id}/complexity`);
    if (!res.ok) throw new Error('Failed to fetch complexity timeline');
    return res.json();
  },

  async getAIInsights(id: number): Promise<AICommitInsight[]> {
    const res = await fetch(`${API_BASE}/repositories/${id}/ai-insights`);
    if (!res.ok) throw new Error('Failed to fetch AI commit insights');
    return res.json();
  },
};
