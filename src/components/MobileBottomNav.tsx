import React from 'react';
import type { TabId } from '../types';

interface NavTab {
  id: TabId;
  label: string;
  icon?: string;
}

interface MobileBottomNavProps {
  tabs: NavTab[];
  activeTabId: TabId;
  onTabChange: (tabId: TabId) => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ tabs, activeTabId, onTabChange }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-700/80 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)] z-40">
      <div className="flex justify-around items-start h-16 pt-2">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 focus-visible:ring-blue-500 rounded-md ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon with float animation */}
              <div className={`transform transition-all duration-300 ease-out ${isActive ? '-translate-y-1 scale-110' : ''}`}>
                <span className="material-icons !text-2xl">{tab.icon}</span>
              </div>

              {/* Label */}
              <span className={`text-xs mt-1 transition-all duration-200 ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;