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
      <div className="relative border-b border-slate-200 dark:border-slate-700">
        <nav ref={tabsRef} className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => {
             const isActive = activeTabId === tab.id;

            return (
              <div key={tab.id} data-tab-id={tab.id} className="relative group flex-shrink-0">
                <button
                  id={`tab-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  className={`
                    whitespace-nowrap text-sm transition-colors duration-200 rounded-t-lg
                    flex items-center gap-2 py-4 px-6
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 z-10
                    ${
                      isActive
                        ? 'font-bold text-blue-600 dark:text-blue-400'
                        : 'font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-700 dark:hover:text-slate-200'
                    }
                    ${tab.isClosable && onTabClose ? 'pr-9' : ''}
                  `}
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
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 dark:text-slate-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors opacity-50 group-hover:opacity-100 focus:opacity-100 z-20"
                    aria-label={`Cerrar pestaña ${tab.label}`}
                  >
                    <span className="material-icons !text-base">close</span>
                  </button>
                )}
              </div>
            )
          })}
        </nav>
        <div 
           className="absolute bottom-0 h-1 bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500 ease-in-out"
           style={gliderStyle}
        />
      </div>
      <div className="pt-6">
        {tabs.map(tab => (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id}`}
            role="tabpanel"
            hidden={activeTabId !== tab.id}
            className="focus:outline-none"
            aria-labelledby={`tab-${tab.id}`}
            tabIndex={0}
          >
            {/* El contenido de la pestaña se renderiza aquí y se mantiene en el DOM */}
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;