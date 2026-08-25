import { useEditor } from '../../EditorContext';
import type { CanvasLayer } from '../../CoverCanvasEngine';
import { PanelHeader } from '../PanelHeader';
import { BADGE_DEFINITIONS } from '../../lidojs-config/shapes';

interface BadgeContentProps {
  onClose: () => void;
}

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'live': { bg: '#EF4444', text: '#FFFFFF' },
  'podcast': { bg: '#8B5CF6', text: '#FFFFFF' },
  'exclusive': { bg: '#F59E0B', text: '#000000' },
  'news': { bg: '#3B82F6', text: '#FFFFFF' },
  'episode': { bg: '#10B981', text: '#FFFFFF' },
  'breaking': { bg: '#DC2626', text: '#FFFFFF' },
  'premiere': { bg: '#7C3AED', text: '#FFFFFF' },
  'new': { bg: '#059669', text: '#FFFFFF' },
};

export const BadgeContent = ({ onClose }: BadgeContentProps) => {
  const { addLayer, selectLayer } = useEditor();

  const addBadge = (badge: (typeof BADGE_DEFINITIONS)[number]) => {
    const colors = BADGE_COLORS[badge.id.replace('badge-', '')] || { bg: badge.bgColor, text: badge.textColor };

    const layer: CanvasLayer = {
      id: `badge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `Badge: ${badge.text}`,
      type: 'badge',
      x: 100,
      y: 60,
      width: 220,
      height: 65,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: badge.text,
      badgeStyle: (badge.id.replace('badge-', '') as 'live' | 'podcast' | 'exclusive' | 'news'),
    };
    addLayer(layer);
    selectLayer(layer.id);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PanelHeader title="Badges" onClose={onClose} />

      <div className="p-4">
        <div className="py-2 font-bold text-sm text-white/80">Badges Profissionais</div>
        <div className="grid grid-cols-2 gap-3">
          {BADGE_DEFINITIONS.map((badge) => (
            <div
              key={badge.id}
              className="cursor-pointer p-4 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform shadow-sm"
              style={{ backgroundColor: badge.bgColor }}
              onClick={() => addBadge(badge)}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span
                className="text-xs font-bold tracking-wider"
                style={{ color: badge.textColor }}
              >
                {badge.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
