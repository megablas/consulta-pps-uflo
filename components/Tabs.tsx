import React, { ReactNode, useRef, useState, useLayoutEffect } from 'react';

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
  
  const tabsRef = useRef<HTMLDivElement>(null);
  const [gliderStyle, setGliderStyle] = useState({});

  useLayoutEffect(() => {
    const activeTabNode = tabsRef.current?.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeTabNode) {
      const { offsetLeft, offsetWidth } = activeTabNode as HTMLElement;
      setGliderStyle({
        transform: `translateX(${offsetLeft}px)`,
        width: `${offsetWidth}px`,
      });
    }
  }, [activeTabId, tabs]); // Re-calculate on tab change or when tabs themselves change

  return (
    <div className={className}>
      <div className="relative border-b border-slate-200">
        <nav ref={tabsRef} className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => (
            <div key={tab.id} data-tab-id={tab.id} className="relative group flex-shrink-0">
              <button
                onClick={() => onTabChange(tab.id)}
                className={`
                  whitespace-nowrap py-3 px-4 text-sm transition-colors duration-200 rounded-t-lg
                  flex items-center gap-2
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 z-10
                  ${
                    activeTabId === tab.id
                      ? 'font-semibold text-blue-600'
                      : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-700 font-medium'
                  }
                  ${tab.isClosable && onTabClose ? 'pr-9' : ''}
                `}
                aria-current={activeTabId === tab.id ? 'page' : undefined}
              >
                {tab.icon && <span className="material-icons !text-lg">{tab.icon}</span>}
                <span className="truncate max-w-[150px] sm:max-w-none">{tab.label}</span>
              </button>
              {tab.isClosable && onTabClose && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors opacity-50 group-hover:opacity-100 focus:opacity-100 z-20"
                  aria-label={`Cerrar pestaña ${tab.label}`}
                >
                  <span className="material-icons !text-base">close</span>
                </button>
              )}
            </div>
          ))}
        </nav>
        <div 
           className="absolute bottom-0 h-0.5 bg-blue-500 rounded-full transition-all duration-300 ease-out"
           style={gliderStyle}
        />
      </div>
      <div className="pt-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {activeTabContent}
      </div>
    </div>
  );
};

export default Tabs;