import React from 'react';
import { useVisualizerStore } from '../../state/store';
import { Trophy, PlusCircle, MinusCircle } from 'lucide-react';

export const ContributorLeaderboardPanel: React.FC = () => {
  const { contributors } = useVisualizerStore();

  if (contributors.length === 0) return null;

  // Max commits for relative bar sizing
  const maxCommits = Math.max(...contributors.map((c) => c.total_commits));

  return (
    <div className="bg-darkCard border border-darkBorder rounded-xl p-5 shadow-lg flex flex-col gap-4 h-full">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-darkBorder pb-3">
        <Trophy className="w-4 h-4 text-amber-500" /> Top Contributors
      </h3>

      <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-3.5 max-h-[350px] lg:max-h-none">
        {contributors.map((contrib, index) => {
          const percentage = maxCommits > 0 ? (contrib.total_commits / maxCommits) * 100 : 0;
          
          return (
            <div key={contrib.id} className="flex flex-col gap-1.5 group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 group-hover:bg-slate-700 transition-colors">
                    {index + 1}
                  </div>
                  <span className="font-bold text-slate-200 truncate max-w-[140px]" title={contrib.name}>
                    {contrib.name}
                  </span>
                </div>
                <span className="font-semibold text-slate-300 font-mono">{contrib.total_commits} commits</span>
              </div>

              {/* Relative commit percentage bar */}
              <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Details line size impacts */}
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium pl-7">
                <span className="flex items-center gap-0.5 text-emerald-500/80">
                  <PlusCircle className="w-3 h-3" /> {contrib.lines_added.toLocaleString()}
                </span>
                <span className="flex items-center gap-0.5 text-rose-500/80">
                  <MinusCircle className="w-3 h-3" /> {contrib.lines_deleted.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
