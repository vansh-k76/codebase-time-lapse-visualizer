import React from 'react';
import { useVisualizerStore } from '../../state/store';
import { ComplexityTimeChart } from '../charts/ComplexityTimeChart';
import { ComplexityLocChart } from '../charts/ComplexityLocChart';
import { ComplexityHeatmap } from '../charts/ComplexityHeatmap';
import { Network, LayoutGrid, FileText, Code2 } from 'lucide-react';

export const ComplexityDashboard: React.FC = () => {
  const { commits, currentIndex, complexityTimeline, currentTree } = useVisualizerStore();

  const currentCommit = commits[currentIndex] || {};
  const totalLines = currentCommit.total_lines ?? 0;
  const fileCount = currentCommit.file_count ?? 0;
  const avgFileSize = currentCommit.average_file_size ?? 0;
  const complexityScore = currentCommit.complexity_score ?? 0;

  return (
    <div className="flex-grow flex flex-col gap-6 overflow-y-auto pr-1 h-full pb-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Complexity Score */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 bg-blue-950/60 rounded-lg text-blue-400 border border-blue-900/30">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Complexity Score</div>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{complexityScore.toLocaleString()}</div>
          </div>
        </div>

        {/* Card 2: Total Lines of Code */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 bg-purple-950/60 rounded-lg text-purple-400 border border-purple-900/30">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Total Lines</div>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{totalLines.toLocaleString()}</div>
          </div>
        </div>

        {/* Card 3: File Count */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 bg-cyan-950/60 rounded-lg text-cyan-400 border border-cyan-900/30">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Total Files</div>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{fileCount.toLocaleString()}</div>
          </div>
        </div>

        {/* Card 4: Average File Size */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 bg-emerald-950/60 rounded-lg text-emerald-400 border border-emerald-900/30">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Avg File Size</div>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">
              {Math.round(avgFileSize).toLocaleString()} <span className="text-[10px] text-slate-500 normal-case">lines</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-5 flex flex-col gap-4 shadow-lg">
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Complexity Score Timeline</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Evolution of cumulative code complexity over time</p>
          </div>
          <div className="w-full h-[280px]">
            {complexityTimeline.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">No complexity stats available</div>
            ) : (
              <ComplexityTimeChart data={complexityTimeline} />
            )}
          </div>
        </div>

        {/* LOC vs Complexity Scatter Plot */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-5 flex flex-col gap-4 shadow-lg">
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">LOC vs Complexity</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Commit metrics correlation (LOC vs Complexity score)</p>
          </div>
          <div className="w-full h-[280px]">
            {commits.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">No commit history available</div>
            ) : (
              <ComplexityLocChart data={commits} />
            )}
          </div>
        </div>
      </div>

      {/* Complexity Treemap Heatmap */}
      <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-5 flex flex-col gap-4 shadow-lg min-h-[350px]">
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Codebase Complexity Heatmap</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            File size representation (Lines of Code) colored by static Complexity Score (Green = Low, Yellow/Orange = Medium, Red = High)
          </p>
        </div>
        <div className="flex-grow w-full min-h-[300px]">
          {!currentTree ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">Calculating snapshot complexity...</div>
          ) : (
            <ComplexityHeatmap tree={currentTree} />
          )}
        </div>
      </div>
    </div>
  );
};
