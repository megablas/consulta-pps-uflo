import React from 'react';

interface SubTab {
  id: string;
  label: string;
  icon?: string;
}

interface SubTabsProps {
  tabs: SubTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

const SubTabs: React.FC<SubTabsProps> = ({ tabs, activeTabId, onTabChange }) => {
  return (
    <div className="border-b border-slate-200/80 dark:border-slate-700/60">
      <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Sub-tabs" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            className={`
              whitespace-nowrap pb-3 px-1 border-b-2 text-sm transition-colors duration-200 flex items-center gap-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-slate-900 rounded-t-sm
              ${
                activeTabId === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 font-medium'
              }
            `}
            aria-selected={activeTabId === tab.id}
          >
            {tab.icon && <span className="material-icons !text-base">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SubTabs;
