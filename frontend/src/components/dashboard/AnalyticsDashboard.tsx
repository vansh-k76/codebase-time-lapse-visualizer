import React from 'react';
import { useVisualizerStore } from '../../state/store';
import { GrowthChart } from '../charts/GrowthChart';
import { ContributorActivityChart } from '../charts/ContributorActivityChart';
import { TrendingUp, Users2 } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const { dailyMetrics, commits, contributors } = useVisualizerStore();

  return (
    <div className="flex-grow flex flex-col gap-6 overflow-y-auto pr-1">
      {/* Growth Analytics Section */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" /> Growth Dashboard
        </h3>
        {dailyMetrics.length === 0 ? (
          <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-8 text-center text-xs text-slate-500">
            No daily metrics available. Run repository analysis to generate growth charts.
          </div>
        ) : (
          <GrowthChart data={dailyMetrics} />
        )}
      </div>

      {/* Contributor Analytics Section */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Users2 className="w-4 h-4 text-blue-500" /> Contributor Analytics
        </h3>
        {commits.length === 0 || contributors.length === 0 ? (
          <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-8 text-center text-xs text-slate-500">
            No contributor activity data available. Run repository analysis to generate contributor charts.
          </div>
        ) : (
          <ContributorActivityChart commits={commits} contributors={contributors} />
        )}
      </div>
    </div>
  );
};
