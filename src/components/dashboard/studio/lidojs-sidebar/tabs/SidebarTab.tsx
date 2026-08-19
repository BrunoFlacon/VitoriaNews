import type { ReactNode } from 'react';

interface SidebarTabProps {
  tabs: { name: string; icon: ReactNode; isBusiness?: boolean }[];
  active: string | null;
  onChange: (e: React.MouseEvent, tab: string) => void;
}

export const SidebarTab = ({ tabs, active, onChange }: SidebarTabProps) => {
  const activeIdx = tabs.findIndex((t) => t.name === active);

  return (
    <div className="color-[#5E6278] border-r border-gray-200/60 overflow-y-auto">
      <div className="relative">
        {/* Active background indicator */}
        {activeIdx >= 0 && (
          <div className="bg-white w-[72px] h-[72px] absolute left-0 top-0 transition-transform duration-200"
            style={{ transform: `translateY(${activeIdx * 100}%)` }}
          >
            {/* Top notch */}
            <div className="absolute h-2 w-2 right-0 -top-2"
              style={{
                background: 'radial-gradient(circle closest-side,transparent 0,transparent 50%,#fff 0) 200% 200%/400% 400%',
              }}
            />
            {/* Bottom notch */}
            <div className="absolute h-2 w-2 right-0 -bottom-2"
              style={{
                transform: 'scaleY(-1)',
                background: 'radial-gradient(circle closest-side,transparent 0,transparent 50%,#fff 0) 200% 200%/400% 400%',
              }}
            />
          </div>
        )}

        {tabs.map((tab, idx) => {
          const isActive = idx === activeIdx;
          return (
            <div
              key={tab.name}
              className={`
                relative flex flex-col justify-center items-center px-0.5
                h-[72px] w-[72px] min-w-[72px] min-h-[72px] cursor-pointer
                transition-colors duration-150
                ${isActive ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}
                ${idx === activeIdx - 1 ? 'rounded-br-lg' : ''}
                ${idx === activeIdx + 1 ? 'rounded-tr-lg' : ''}
              `}
              onClick={(e) => onChange(e, tab.name)}
            >
              <div className="text-2xl">{tab.icon}</div>
              <span className="text-[10px] leading-6 font-semibold">{tab.name}</span>
              {tab.isBusiness && (
                <div className="absolute bg-amber-100 rounded-full text-[9px] px-1 py-0.5 top-0">
                  Business
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
