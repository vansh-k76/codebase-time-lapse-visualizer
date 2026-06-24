import React, { useState } from 'react';
import { useVisualizerStore } from '../../state/store';
import { 
  AlertTriangle, 
  Search, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Cpu, 
  Code2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Play
} from 'lucide-react';

export const AIInsightsDashboard: React.FC = () => {
  const { aiInsights, commits, setCurrentIndex } = useVisualizerStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Compute metric summaries
  const totalCommits = aiInsights.length;
  const highRiskCount = aiInsights.filter(i => i.risk_score === 'High').length;
  const mediumRiskCount = aiInsights.filter(i => i.risk_score === 'Medium').length;
  const lowRiskCount = aiInsights.filter(i => i.risk_score === 'Low').length;

  const totalLocDelta = aiInsights.reduce((sum, i) => sum + i.loc_delta, 0);
  const avgComplexityDelta = totalCommits > 0 
    ? aiInsights.reduce((sum, i) => sum + i.complexity_delta, 0) / totalCommits 
    : 0;

  // Filter insights
  const filteredInsights = aiInsights.filter(insight => {
    const matchesSearch = 
      insight.hash.toLowerCase().includes(searchTerm.toLowerCase()) || 
      insight.commit_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.author_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'All' || insight.risk_score === riskFilter;

    return matchesSearch && matchesRisk;
  }).sort((a, b) => new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime()); // Newest first

  const handleCopy = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVisualize = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Find index of this commit in commits list
    const index = commits.findIndex(c => c.hash === hash);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  };

  const toggleExpand = (hash: string) => {
    if (expandedInsight === hash) {
      setExpandedInsight(null);
    } else {
      setExpandedInsight(hash);
    }
  };

  return (
    <div className="flex-grow flex flex-col gap-6 overflow-y-auto pr-1 h-full pb-4">
      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: AI Analysis Coverage */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 bg-blue-950/60 rounded-lg text-blue-400 border border-blue-900/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">AI Analyzed</div>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{totalCommits} <span className="text-[10px] text-slate-500 normal-case">commits</span></div>
          </div>
        </div>

        {/* Card 2: Risk Profile */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className={`p-2.5 rounded-lg border ${highRiskCount > 0 ? 'bg-red-950/60 text-red-400 border-red-900/30' : 'bg-emerald-950/60 text-emerald-400 border-emerald-900/30'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">High Risk Changes</div>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{highRiskCount}</div>
          </div>
        </div>

        {/* Card 3: Avg Complexity Delta */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className={`p-2.5 rounded-lg border ${avgComplexityDelta > 0 ? 'bg-amber-950/60 text-amber-400 border-amber-900/30' : 'bg-emerald-950/60 text-emerald-400 border-emerald-900/30'}`}>
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Avg Complexity Δ</div>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">
              {avgComplexityDelta > 0 ? '+' : ''}{avgComplexityDelta.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Card 4: Total LOC Net Delta */}
        <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 bg-purple-950/60 rounded-lg text-purple-400 border border-purple-900/30">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Net LOC Delta</div>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">
              {totalLocDelta > 0 ? '+' : ''}{totalLocDelta.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-darkCard/30 border border-darkBorder rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search commits, authors, or messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/50 border border-darkBorder rounded-lg focus:outline-none focus:border-blue-500 text-slate-200 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start md:self-auto bg-slate-950/50 border border-darkBorder p-1 rounded-lg">
          {(['All', 'High', 'Medium', 'Low'] as const).map((level) => {
            const counts = {
              All: totalCommits,
              High: highRiskCount,
              Medium: mediumRiskCount,
              Low: lowRiskCount
            };
            return (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  riskFilter === level
                    ? level === 'High'
                      ? 'bg-red-950/60 text-red-400 border border-red-900/30 shadow'
                      : level === 'Medium'
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-900/30 shadow'
                      : level === 'Low'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/30 shadow'
                      : 'bg-blue-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {level} ({counts[level]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Commit Insights Table/List */}
      <div className="flex flex-col gap-3">
        {filteredInsights.length === 0 ? (
          <div className="bg-darkCard/20 border border-dashed border-darkBorder rounded-2xl p-12 text-center text-xs text-slate-500">
            No commit insights matching the selected filters.
          </div>
        ) : (
          filteredInsights.map((insight) => {
            const isExpanded = expandedInsight === insight.hash;
            
            // Format Risk Color styles
            let riskBadgeStyle = 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400';
            if (insight.risk_score === 'High') {
              riskBadgeStyle = 'bg-red-950/30 border-red-900/40 text-red-400';
            } else if (insight.risk_score === 'Medium') {
              riskBadgeStyle = 'bg-amber-950/30 border-amber-900/40 text-amber-400';
            }

            // Format date
            const dateStr = new Date(insight.committed_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={insight.hash}
                className="bg-darkCard/30 border border-darkBorder rounded-xl shadow transition-all hover:bg-darkCard/40"
              >
                {/* Header row */}
                <div 
                  onClick={() => toggleExpand(insight.hash)}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Expand indicator */}
                    <div className="mt-1 text-slate-500 hover:text-slate-300 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>

                    <div className="flex flex-col gap-1 max-w-[500px]">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded border border-darkBorder flex items-center gap-1.5">
                          {insight.hash.substring(0, 8)}
                          <button 
                            onClick={(e) => handleCopy(insight.hash, e)}
                            className="text-slate-600 hover:text-slate-300"
                          >
                            {copiedHash === insight.hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{insight.author_name}</span>
                        <span className="text-[9px] text-slate-600 font-semibold">{dateStr}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 truncate mt-0.5" title={insight.commit_message}>
                        {insight.commit_message}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 lg:self-center self-end">
                    {/* Complexity Delta */}
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                      {insight.complexity_delta > 0 ? (
                        <span className="text-red-400 flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          +{insight.complexity_delta.toFixed(1)} Complexity
                        </span>
                      ) : insight.complexity_delta < 0 ? (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <TrendingDown className="w-3 h-3" />
                          {insight.complexity_delta.toFixed(1)} Complexity
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-0.5">
                          <Minus className="w-3 h-3" />
                          0.0 Complexity
                        </span>
                      )}
                    </div>

                    {/* LOC Delta */}
                    <div className="text-[10px] font-mono font-bold text-slate-300">
                      {insight.loc_delta > 0 ? `+${insight.loc_delta}` : insight.loc_delta} LOC
                    </div>

                    {/* Risk Badge */}
                    <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${riskBadgeStyle}`}>
                      {insight.risk_score} Risk
                    </span>
                  </div>
                </div>

                {/* Collapsible content area */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-darkBorder/40 bg-slate-950/20 rounded-b-xl flex flex-col gap-4 animate-fadeIn">
                    {/* Impacted files chips */}
                    {insight.most_impacted_files.length > 0 && (
                      <div>
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Most Impacted Files</div>
                        <div className="flex flex-wrap gap-1.5">
                          {insight.most_impacted_files.map((file, idx) => (
                            <span 
                              key={idx} 
                              className="text-[9px] font-mono px-2.5 py-1 bg-slate-900 border border-darkBorder rounded text-slate-300"
                              title={file}
                            >
                              {file}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Insight Summaries */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                      {/* Summary callout */}
                      <div className="bg-slate-900/60 border border-darkBorder/60 p-4 rounded-xl flex flex-col gap-2 shadow-sm">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Engineering Summary
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {insight.summary}
                        </p>
                      </div>

                      {/* Recommendations callout */}
                      <div className="bg-slate-900/60 border border-darkBorder/60 p-4 rounded-xl flex flex-col gap-2 shadow-sm">
                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Refactoring Recommendation
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {insight.refactoring_recommendation}
                        </p>
                      </div>
                    </div>

                    {/* Visualize/Sync buttons */}
                    <div className="flex justify-end gap-2.5 mt-2 pt-3 border-t border-darkBorder/20">
                      <button
                        onClick={(e) => handleVisualize(insight.hash, e)}
                        className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-md"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Visualize Commit Snapshot
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
