export interface Repository {
  id: number;
  name: string;
  url: string | null;
  local_path: string | null;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  last_analyzed_at: string | null;
  created_at: string;
}

export interface Commit {
  id: number;
  hash: string;
  author_name: string;
  author_email: string;
  message: string;
  committed_at: string;
  lines_added: number;
  lines_deleted: number;
  files_changed: number;
  total_lines?: number;
  file_count?: number;
  average_file_size?: number;
  complexity_score?: number;
}

export interface Contributor {
  id: number;
  name: string;
  email: string;
  total_commits: number;
  lines_added: number;
  lines_deleted: number;
}

export interface FileChange {
  id: number;
  filepath: string;
  change_type: 'ADD' | 'MODIFY' | 'DELETE' | 'RENAME';
  lines_added: number;
  lines_deleted: number;
  file_type: string;
}

export interface DailyMetric {
  record_date: string;
  total_files: number;
  total_lines: number;
  active_contributors_count: number;
}

export interface RepositorySummary {
  repository: Repository;
  total_commits: number;
  total_contributors: number;
  total_lines: number;
  total_files: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  lines?: number;
  file_type?: string;
  complexity?: number;
  children?: FileNode[];
}

// D3 Node & Link typings for visualization
export interface D3Node extends d3.SimulationNodeDatum {
  id: string; // matches node path
  name: string;
  type: 'file' | 'directory';
  lines: number;
  file_type: string;
  depth: number;
}

export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string;
  target: string;
}

export interface CommitComplexity {
  hash: string;
  committed_at: string;
  total_lines: number;
  file_count: number;
  average_file_size: number;
  complexity_score: number;
}

export interface AICommitInsight {
  hash: string;
  commit_message: string;
  committed_at: string;
  author_name: string;
  complexity_delta: number;
  loc_delta: number;
  risk_score: 'Low' | 'Medium' | 'High';
  most_impacted_files: string[];
  summary: string;
  refactoring_recommendation: string;
}
