import React from 'react';
import { Camera, Cpu, BarChart3 } from 'lucide-react';
import { TabMode } from '../../types';

interface NavbarProps {
  activeTab: TabMode;
  onSelectTab: (tab: TabMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'live' as TabMode, label: 'Live Vision HUD', icon: Camera, badge: 'Edge AI' },
    { id: 'simulation' as TabMode, label: 'Wokwi RP2040 Hardware Sim', icon: Cpu, badge: '43.4 ms' },
    { id: 'benchmark' as TabMode, label: '4-Student Benchmark', icon: BarChart3, badge: 'ResNet50 59.3%' },
  ];

  return (
    <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
