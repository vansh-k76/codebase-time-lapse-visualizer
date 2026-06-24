import React from 'react';
import { GitCompare, HelpCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="bg-darkCard border-b border-darkBorder px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
          <GitCompare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-black tracking-tight text-white">Codebase Time-Lapse Visualizer</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Git repository evolution insights</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 font-medium"
        >
          <HelpCircle className="w-4 h-4" /> Documentation
        </a>
      </div>
    </header>
  );
};
