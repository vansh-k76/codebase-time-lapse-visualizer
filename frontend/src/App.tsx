import { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { RepositorySelector } from './components/repository/RepositorySelector';
import { StatsSummaryPanel } from './components/dashboard/StatsSummaryPanel';
import { TimelapseCanvas } from './components/charts/TimelapseCanvas';
import { ContributorLeaderboardPanel } from './components/dashboard/ContributorLeaderboardPanel';
import { PlaybackControlPanel } from './components/timeline/PlaybackControlPanel';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { ComplexityDashboard } from './components/dashboard/ComplexityDashboard';
import { AIInsightsDashboard } from './components/dashboard/AIInsightsDashboard';
import { useVisualizerStore } from './state/store';
import { GitCompare, Loader2 } from 'lucide-react';

function App() {
  const { activeRepoId, currentTree, isLoading } = useVisualizerStore();
  const [activeTab, setActiveTab] = useState<'timelapse' | 'analytics' | 'complexity' | 'ai-insights'>('timelapse');

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100 font-sans">
      <Navbar />

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-68px)]">
        {/* Left Sidebar: Repository List */}
        <aside className="w-full lg:w-[320px] bg-darkCard border-b lg:border-b-0 lg:border-r border-darkBorder p-5 flex-shrink-0 flex flex-col h-1/3 lg:h-full">
          <RepositorySelector />
        </aside>

        {/* Right Content Pane */}
        <section className="flex-grow flex flex-col overflow-y-auto lg:overflow-hidden p-6 gap-6 h-2/3 lg:h-full">
          {isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-3" />
              <p className="text-sm font-semibold">Fetching project databases...</p>
            </div>
          ) : activeRepoId ? (
            <div className="flex-grow flex flex-col gap-6 overflow-hidden">
              {/* Dashboard metrics header */}
              <StatsSummaryPanel />

              {/* View Tab Switcher */}
              <div className="flex items-center border-b border-darkBorder pb-2">
                <div className="flex items-center gap-1 bg-slate-900 border border-darkBorder rounded-xl p-1 shadow-inner">
                  <button
                    onClick={() => setActiveTab('timelapse')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'timelapse'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Time-Lapse Tree View
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'analytics'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Analytics Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('complexity')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'complexity'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Complexity Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('ai-insights')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'ai-insights'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    AI Insights
                  </button>
                </div>
              </div>

              {activeTab === 'timelapse' && (
                <>
                  {/* Visualization Canvas Grid */}
                  <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[350px] overflow-hidden">
                    <div className="lg:col-span-3 h-full overflow-hidden">
                      <TimelapseCanvas tree={currentTree} />
                    </div>
                    <div className="lg:col-span-1 h-full overflow-hidden">
                      <ContributorLeaderboardPanel />
                    </div>
                  </div>

                  {/* Bottom Playback HUD */}
                  <div className="flex-shrink-0">
                    <PlaybackControlPanel />
                  </div>
                </>
              )}
              {activeTab === 'analytics' && <AnalyticsDashboard />}
              {activeTab === 'complexity' && (
                <>
                  <div className="flex-grow overflow-hidden">
                    <ComplexityDashboard />
                  </div>
                  {/* Bottom Playback HUD */}
                  <div className="flex-shrink-0">
                    <PlaybackControlPanel />
                  </div>
                </>
              )}
              {activeTab === 'ai-insights' && (
                <>
                  <div className="flex-grow overflow-hidden">
                    <AIInsightsDashboard />
                  </div>
                  {/* Bottom Playback HUD */}
                  <div className="flex-shrink-0">
                    <PlaybackControlPanel />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-darkBorder rounded-2xl p-12 text-center max-w-xl mx-auto my-auto shadow-sm">
              <div className="p-4 bg-slate-800/50 rounded-2xl text-slate-400 mb-4">
                <GitCompare className="w-10 h-10" />
              </div>
              <h2 className="text-base font-bold text-slate-200 mb-1">No Active Project Selected</h2>
              <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                Connect a new local or remote Git repository from the sidebar menu, or select an existing scanned project to visualize its time-lapse growth.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
