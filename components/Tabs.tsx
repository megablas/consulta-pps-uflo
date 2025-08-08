import React, { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  content: ReactNode;
  isClosable?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTabId, onTabChange, onTabClose, className = '' }) => {
  const activeTabContent = tabs.find(tab => tab.id === activeTabId)?.content;

  return (
    <div className={className}>
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => (
            <div key={tab.id} className="relative flex items-center group">
              <button
                onClick={() => onTabChange(tab.id)}
                className={`
                  whitespace-nowrap py-4 pl-3 sm:pl-4 border-b-2 font-semibold text-sm transition-colors rounded-t-md
                  flex items-center gap-2
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0
                  ${
                    activeTabId === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                  ${tab.isClosable && onTabClose ? 'pr-10' : 'pr-3 sm:pr-4'}
                `}
                aria-current={activeTabId === tab.id ? 'page' : undefined}
              >
                {tab.icon && <span className="material-icons !text-xl">{tab.icon}</span>}
                <span className="truncate max-w-[150px] sm:max-w-none">{tab.label}</span>
              </button>
              {tab.isClosable && onTabClose && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Cerrar pestaña ${tab.label}`}
                >
                  <span className="material-icons !text-base">close</span>
                </button>
              )}
            </div>
          ))}
        </nav>
      </div>
      <div className="pt-6 animate-fade-in-up">
        {activeTabContent}
      </div>
    </div>
  );
};

export default Tabs;