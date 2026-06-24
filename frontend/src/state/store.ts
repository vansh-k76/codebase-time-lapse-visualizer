import { create } from 'zustand';
import { api } from '../services/api';
import type { Repository, Commit, Contributor, DailyMetric, FileNode, RepositorySummary, CommitComplexity, AICommitInsight } from '../types';

interface VisualizerState {
  repositories: Repository[];
  activeRepoId: number | null;
  activeRepoSummary: RepositorySummary | null;
  commits: Commit[];
  currentIndex: number;
  currentTree: FileNode | null;
  contributors: Contributor[];
  dailyMetrics: DailyMetric[];
  complexityTimeline: CommitComplexity[];
  aiInsights: AICommitInsight[];
  isPlaying: boolean;
  playbackSpeed: number; // in milliseconds
  isLoading: boolean;
  isLoadingSnapshot: boolean;

  fetchRepositories: () => Promise<void>;
  selectRepository: (id: number) => Promise<void>;
  connectRepository: (name: string, url?: string, localPath?: string) => Promise<void>;
  deleteRepository: (id: number) => Promise<void>;
  
  setCurrentIndex: (index: number) => Promise<void>;
  stepForward: () => Promise<void>;
  stepBackward: () => Promise<void>;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  resetPlayback: () => Promise<void>;
}

export const useVisualizerStore = create<VisualizerState>((set, get) => ({
  repositories: [],
  activeRepoId: null,
  activeRepoSummary: null,
  commits: [],
  currentIndex: 0,
  currentTree: null,
  contributors: [],
  dailyMetrics: [],
  complexityTimeline: [],
  aiInsights: [],
  isPlaying: false,
  playbackSpeed: 1000,
  isLoading: false,
  isLoadingSnapshot: false,

  fetchRepositories: async () => {
    try {
      const repos = await api.getRepositories();
      set({ repositories: repos });
    } catch (err) {
      console.error(err);
    }
  },

  selectRepository: async (id: number) => {
    set({ activeRepoId: id, isPlaying: false, currentIndex: 0, currentTree: null, isLoading: true });
    try {
      const [summary, commits, contributors, metrics, complexity, aiInsights] = await Promise.all([
        api.getRepositorySummary(id),
        api.getCommits(id),
        api.getContributors(id),
        api.getDailyMetrics(id),
        api.getComplexityTimeline(id),
        api.getAIInsights(id),
      ]);

      set({
        activeRepoSummary: summary,
        commits,
        contributors,
        dailyMetrics: metrics,
        complexityTimeline: complexity,
        aiInsights,
      });

      // Load initial commit snapshot
      if (commits.length > 0) {
        await get().setCurrentIndex(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  connectRepository: async (name: string, url?: string, localPath?: string) => {
    set({ isLoading: true });
    try {
      await api.connectRepository({ name, url, local_path: localPath });
      await get().fetchRepositories();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteRepository: async (id: number) => {
    try {
      await api.deleteRepository(id);
      const activeId = get().activeRepoId;
      if (activeId === id) {
        set({ activeRepoId: null, activeRepoSummary: null, commits: [], currentIndex: 0, currentTree: null, aiInsights: [] });
      }
      await get().fetchRepositories();
    } catch (err) {
      console.error(err);
    }
  },

  setCurrentIndex: async (index: number) => {
    const { commits, activeRepoId } = get();
    if (!activeRepoId || commits.length === 0) return;
    
    // Bounds check
    const safeIndex = Math.max(0, Math.min(index, commits.length - 1));
    set({ currentIndex: safeIndex, isLoadingSnapshot: true });
    
    try {
      const commit = commits[safeIndex];
      const snapshot = await api.getFileSnapshot(activeRepoId, commit.hash);
      set({ currentTree: snapshot.tree });
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoadingSnapshot: false });
    }
  },

  stepForward: async () => {
    const { currentIndex, commits } = get();
    if (currentIndex < commits.length - 1) {
      await get().setCurrentIndex(currentIndex + 1);
    } else {
      set({ isPlaying: false }); // stop at end
    }
  },

  stepBackward: async () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      await get().setCurrentIndex(currentIndex - 1);
    }
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
  },

  resetPlayback: async () => {
    set({ isPlaying: false });
    await get().setCurrentIndex(0);
  },
}));
