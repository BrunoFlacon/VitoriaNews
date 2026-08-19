import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface PanelHeaderProps {
  title: string;
  onClose?: () => void;
  children?: ReactNode;
}

export const PanelHeader = ({ title, onClose, children }: PanelHeaderProps) => (
  <div className="flex items-center justify-center shrink-0 h-12 border-b border-gray-700/10 px-5">
    <p className="line-height-[48px] font-semibold text-gray-800 flex-1 text-sm">
      {title}
    </p>
    {children}
    {onClose && (
      <div
        className="text-xl shrink-0 w-8 h-8 cursor-pointer flex items-center justify-center text-gray-500 hover:text-gray-800"
        onClick={onClose}
      >
        <X size={16} />
      </div>
    )}
  </div>
);
