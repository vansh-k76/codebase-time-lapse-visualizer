import React from 'react';
import { useVisualizerStore } from '../../state/store';
import type { FileNode } from '../../types';
import { GitCommit, Users, FileText, Code2 } from 'lucide-react';

export const StatsSummaryPanel: React.FC = () => {
  const { activeRepoSummary, commits, currentTree, contributors } = useVisualizerStore();

  const countSnapshotStats = (node: FileNode | null): { files: number; lines: number } => {
    if (!node) return { files: 0, lines: 0 };
    let files = 0;
    let lines = 0;

    if (node.type === 'file') {
      files = 1;
      lines = node.lines || 0;
    }

    if (node.children) {
      node.children.forEach(child => {
        const stats = countSnapshotStats(child);
        files += stats.files;
        lines += stats.lines;
      });
    }

    return { files, lines };
  };

  const { files: currentFiles, lines: currentLines } = countSnapshotStats(currentTree);

  if (!activeRepoSummary) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Commits */}
      <div className="bg-darkCard border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
        <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-500">
          <GitCommit className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total Commits</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5">{commits.length}</div>
        </div>
      </div>

      {/* Contributors */}
      <div className="bg-darkCard border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
        <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Contributors</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5">{contributors.length}</div>
        </div>
      </div>

      {/* Current Files */}
      <div className="bg-darkCard border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
        <div className="p-2.5 bg-cyan-500/10 rounded-lg text-cyan-500">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Active Files</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5">{currentFiles}</div>
        </div>
      </div>

      {/* Current Lines of Code */}
      <div className="bg-darkCard border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
        <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-500">
          <Code2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Lines of Code</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5">{currentLines.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};
