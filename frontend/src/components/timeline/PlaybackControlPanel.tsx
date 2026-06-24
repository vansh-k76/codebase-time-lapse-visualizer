import React, { useEffect } from 'react';
import { useVisualizerStore } from '../../state/store';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Calendar, User, Hash } from 'lucide-react';

export const PlaybackControlPanel: React.FC = () => {
  const {
    commits,
    currentIndex,
    isPlaying,
    playbackSpeed,
    togglePlay,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    resetPlayback,
    setCurrentIndex,
  } = useVisualizerStore();

  // Setup playback loop timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      stepForward();
    }, playbackSpeed);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, stepForward]);

  if (commits.length === 0) return null;

  const currentCommit = commits[currentIndex];
  const progressPercent = (currentIndex / (commits.length - 1)) * 100;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-darkCard border border-darkBorder rounded-xl p-5 shadow-2xl flex flex-col gap-4">
      {/* Commit Info Dashboard */}
      {currentCommit && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-darkBg/60 border border-darkBorder/50 rounded-lg p-3">
          <div className="flex items-start gap-2.5">
            <Hash className="w-4.5 h-4.5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Commit Hash</div>
              <div className="text-xs font-mono font-bold text-slate-200">{currentCommit.hash.substring(0, 8)}</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <User className="w-4.5 h-4.5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Author</div>
              <div className="text-xs font-bold text-slate-200 truncate max-w-[150px]">{currentCommit.author_name}</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Calendar className="w-4.5 h-4.5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Commit Date</div>
              <div className="text-xs text-slate-200 font-medium">{formatDate(currentCommit.committed_at)}</div>
            </div>
          </div>
          <div className="col-span-1 md:col-span-1 border-t md:border-t-0 md:border-l border-darkBorder/50 pt-2 md:pt-0 md:pl-4">
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Message</div>
            <div className="text-xs text-slate-300 font-medium truncate" title={currentCommit.message}>
              {currentCommit.message}
            </div>
          </div>
        </div>
      )}

      {/* Progress slider bar */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-mono text-slate-400 w-10 text-right">{currentIndex + 1} / {commits.length}</span>
        <div className="relative flex-grow h-2 flex items-center group cursor-pointer">
          <input
            type="range"
            min={0}
            max={commits.length - 1}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
          />
          {/* Progress fill overlay */}
          <div 
            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg pointer-events-none -translate-y-1/2"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-slate-400 w-12 text-left">
          {Math.round(progressPercent)}%
        </span>
      </div>

      {/* Controls & Speed Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetPlayback}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors border border-slate-800/80"
            title="Rewind to Beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={stepBackward}
            disabled={currentIndex === 0}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors border border-slate-800/80"
            title="Step Backward"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={togglePlay}
            className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-md transform hover:scale-105 active:scale-95"
            title={isPlaying ? "Pause Playback" : "Start Playback"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
          </button>

          <button
            onClick={stepForward}
            disabled={currentIndex === commits.length - 1}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors border border-slate-800/80"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
            className="bg-slate-800 border border-darkBorder text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
          >
            <option value={1000}>1x Speed (1s / commit)</option>
            <option value={500}>2x Speed (0.5s / commit)</option>
            <option value={200}>5x Speed (0.2s / commit)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
