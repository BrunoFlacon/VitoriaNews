/**
 * LayersPanel — Canva-style layer manager
 *
 * Features:
 * - Visual list with mini-thumbnails
 * - Drag-and-drop reordering
 * - Inline rename (double-click)
 * - Visibility toggle (eye)
 * - Lock toggle (lock)
 * - Group/ungroup with collapsible groups
 * - Context menu (right-click)
 * - Multi-select with Shift+Click
 * - Selection highlighting
 * - Layer type icons
 * - Duplicate / Delete actions
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Type,
  Image,
  Square,
  Tag,
  Star,
  ArrowRight,
  Minus,
  Layers,
  Plus,
  Group,
  Ungroup,
} from 'lucide-react';
import { useEditor } from '../EditorContext';
import type { CanvasLayer } from '../CoverCanvasEngine';

// ── Helpers ────────────────────────────────────────────────────

const LAYER_TYPE_ICONS: Record<CanvasLayer['type'], typeof Eye> = {
  text: Type,
  image: Image,
  badge: Tag,
  shape: Square,
  logo: Image,
};

function getLayerIcon(layer: CanvasLayer): typeof Eye {
  if (layer.shapeType === 'star') return Star;
  if (layer.shapeType === 'arrow') return ArrowRight;
  if (layer.shapeType === 'divider') return Minus;
  return LAYER_TYPE_ICONS[layer.type] || Square;
}

/** Generate a mini thumbnail for a layer using an offscreen canvas */
function LayerThumbnail({ layer }: { layer: CanvasLayer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Checkerboard background for transparency
    const tileSize = 4;
    for (let y = 0; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        ctx.fillStyle =
          (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
            ? '#2a2a3a'
            : '#222233';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    ctx.globalAlpha = layer.opacity;

    if (layer.type === 'image' && layer.content) {
      // Draw image thumbnail
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, w, h);
        // Keep checkerboard for transparency
        for (let y = 0; y < h; y += tileSize) {
          for (let x = 0; x < w; x += tileSize) {
            ctx.fillStyle =
              (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
                ? '#2a2a3a'
                : '#222233';
            ctx.fillRect(x, y, tileSize, tileSize);
          }
        }
        ctx.globalAlpha = layer.opacity;
        // Fit image into thumbnail
        const scale = Math.min(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      };
      img.src = layer.content;
    } else if (layer.type === 'text') {
      // Draw text preview
      ctx.fillStyle = layer.color || '#ffffff';
      const fontSize = Math.min(14, w / 5);
      ctx.font = `${layer.fontWeight || 'bold'} ${fontSize}px ${layer.fontFamily || 'Inter'}, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = layer.content || 'Aa';
      ctx.fillText(text.substring(0, 6), w / 2, h / 2);
    } else if (layer.type === 'shape') {
      // Draw shape preview
      ctx.fillStyle = layer.backgroundColor || '#6366f1';
      const pad = 6;
      if (layer.shapeType === 'circle') {
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w / 2 - pad, h / 2 - pad, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layer.shapeType === 'star') {
        drawStar(ctx, w / 2, h / 2, 5, w / 2 - pad, (w / 2 - pad) / 2);
        ctx.fill();
      } else if (layer.shapeType === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(pad, h / 2);
        ctx.lineTo(w - pad, h / 2);
        ctx.lineTo(w - pad - 6, h / 2 - 4);
        ctx.moveTo(w - pad, h / 2);
        ctx.lineTo(w - pad - 6, h / 2 + 4);
        ctx.strokeStyle = layer.backgroundColor || '#6366f1';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (layer.shapeType === 'divider') {
        ctx.strokeStyle = layer.backgroundColor || '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad, h / 2);
        ctx.lineTo(w - pad, h / 2);
        ctx.stroke();
      } else {
        // rectangle / default
        ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);
      }
    } else if (layer.type === 'badge') {
      // Draw badge preview
      const colors: Record<string, string> = {
        live: '#ef4444',
        podcast: '#8b5cf6',
        exclusive: '#f59e0b',
        news: '#3b82f6',
      };
      ctx.fillStyle = colors[layer.badgeStyle || 'live'] || '#ef4444';
      const bw = w * 0.6;
      const bh = h * 0.35;
      ctx.beginPath();
      ctx.roundRect((w - bw) / 2, (h - bh) / 2, bw, bh, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.min(9, bh * 0.5)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((layer.content || 'LIVE').substring(0, 6).toUpperCase(), w / 2, h / 2);
    }
  }, [layer]);

  return (
    <canvas
      ref={canvasRef}
      width={48}
      height={36}
      className="rounded-sm border border-white/10 shrink-0"
      style={{ imageRendering: 'auto' }}
    />
  );
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number,
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}

// ── Layer Row ──────────────────────────────────────────────────

interface LayerRowProps {
  layer: CanvasLayer;
  isSelected: boolean;
  isGrouped: boolean;
  depth: number;
  dragOverId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
}

function LayerRow({
  layer,
  isSelected,
  isGrouped,
  depth,
  dragOverId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: LayerRowProps) {
  const {
    selectLayer,
    toggleLayerSelection,
    updateLayer,
    moveLayerOrder,
    duplicateLayer,
    removeLayer,
    toggleLayerSelection: _toggle,
  } = useEditor();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const Icon = getLayerIcon(layer);

  // ── Double-click to rename ──
  const handleDoubleClick = useCallback(() => {
    setEditName(layer.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }, [layer.name]);

  const commitRename = useCallback(() => {
    if (editName.trim()) {
      updateLayer(layer.id, { name: editName.trim() });
    }
    setEditing(false);
  }, [editName, layer.id, updateLayer]);

  // ── Click to select ──
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) {
        toggleLayerSelection(layer.id, true);
      } else {
        selectLayer(layer.id);
      }
    },
    [layer.id, selectLayer, toggleLayerSelection],
  );

  // ── Context menu ──
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  useEffect(() => {
    if (!showContextMenu) return;
    const close = () => setShowContextMenu(false);
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('contextmenu', close);
    };
  }, [showContextMenu]);

  // ── Drag & drop highlight ──
  const isDragOver = dragOverId === layer.id;

  return (
    <>
      <div
        ref={rowRef}
        draggable={!layer.locked}
        onDragStart={(e) => onDragStart(e, layer.id)}
        onDragOver={(e) => onDragOver(e, layer.id)}
        onDragEnd={onDragEnd}
        onDrop={(e) => onDrop(e, layer.id)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={`
          group flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors select-none
          ${isSelected ? 'bg-blue-500/20 border-l-2 border-blue-400' : 'border-l-2 border-transparent hover:bg-white/5'}
          ${isDragOver ? 'border-t-2 border-t-blue-400' : ''}
          ${isGrouped ? 'ml-4' : ''}
          ${layer.locked ? 'opacity-60' : ''}
        `}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Drag handle */}
        <div className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 shrink-0">
          <GripVertical size={12} />
        </div>

        {/* Layer thumbnail */}
        <LayerThumbnail layer={layer} />

        {/* Layer info */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          {editing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="bg-white/10 border border-blue-500/50 px-1 py-0.5 text-[11px] text-white w-full focus:outline-none"
              autoFocus
            />
          ) : (
            <span className="text-[11px] text-white/80 truncate font-medium">
              {layer.name}
            </span>
          )}
          <span className="text-[9px] text-white/30 uppercase tracking-wider flex items-center gap-1">
            <Icon size={8} />
            {layer.type}
          </span>
        </div>

        {/* Quick actions (visible on hover) */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Visibility toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateLayer(layer.id, { visible: !layer.visible });
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title={layer.visible ? 'Ocultar' : 'Mostrar'}
          >
            {layer.visible ? (
              <Eye size={12} className="text-white/50" />
            ) : (
              <EyeOff size={12} className="text-red-400" />
            )}
          </button>

          {/* Lock toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateLayer(layer.id, { locked: !layer.locked });
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title={layer.locked ? 'Desbloquear' : 'Bloquear'}
          >
            {layer.locked ? (
              <Lock size={12} className="text-yellow-400/70" />
            ) : (
              <Unlock size={12} className="text-white/30" />
            )}
          </button>
        </div>

        {/* Always-visible visibility dot for hidden layers */}
        {!layer.visible && (
          <div className="w-2 h-2 rounded-full bg-red-500/60 shrink-0" />
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed z-[100] bg-[#1E1E2D] border border-white/10 shadow-xl py-1 min-w-[160px]"
          style={{ left: contextPos.x, top: contextPos.y }}
        >
          <CtxMenuItem
            icon={<Copy size={12} />}
            label="Duplicar"
            onClick={() => {
              duplicateLayer(layer.id);
              setShowContextMenu(false);
            }}
          />
          <CtxMenuItem
            icon={layer.locked ? <Unlock size={12} /> : <Lock size={12} />}
            label={layer.locked ? 'Desbloquear' : 'Bloquear'}
            onClick={() => {
              updateLayer(layer.id, { locked: !layer.locked });
              setShowContextMenu(false);
            }}
          />
          <CtxMenuItem
            icon={layer.visible ? <EyeOff size={12} /> : <Eye size={12} />}
            label={layer.visible ? 'Ocultar' : 'Mostrar'}
            onClick={() => {
              updateLayer(layer.id, { visible: !layer.visible });
              setShowContextMenu(false);
            }}
          />
          <div className="border-t border-white/10 my-1" />
          <CtxMenuItem
            icon={<ChevronRight size={12} />}
            label="Trazer para frente"
            onClick={() => {
              moveLayerOrder(layer.id, 'top');
              setShowContextMenu(false);
            }}
          />
          <CtxMenuItem
            icon={<ChevronDown size={12} />}
            label="Enviar para trás"
            onClick={() => {
              moveLayerOrder(layer.id, 'bottom');
              setShowContextMenu(false);
            }}
          />
          <div className="border-t border-white/10 my-1" />
          <CtxMenuItem
            icon={<Trash2 size={12} />}
            label="Excluir"
            danger
            onClick={() => {
              removeLayer(layer.id);
              setShowContextMenu(false);
            }}
          />
        </div>
      )}
    </>
  );
}

// ── Context Menu Item ──────────────────────────────────────────

function CtxMenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-white/70 hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Main Panel ─────────────────────────────────────────────────

export const LayersPanel = () => {
  const {
    layers,
    selectedLayerId,
    selectedLayerIds,
    selectLayer,
    updateLayer,
    moveLayerOrder,
    addLayer,
    duplicateLayer,
    removeLayer,
    groupSelectedLayers,
    ungroupSelectedLayers,
    canvasWidth,
    canvasHeight,
  } = useEditor();

  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // ── Organize layers: groups first, then ungrouped ──
  const { groupedLayers, ungroupedLayers } = useMemo(() => {
    const groups = new Map<string, CanvasLayer[]>();
    const ungrouped: CanvasLayer[] = [];

    // Process in reverse (top layers first in panel = last in array)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.groupId) {
        if (!groups.has(layer.groupId)) groups.set(layer.groupId, []);
        groups.get(layer.groupId)!.push(layer);
      } else {
        ungrouped.push(layer);
      }
    }

    return { groupedLayers: groups, ungroupedLayers: ungrouped };
  }, [layers]);

  // ── Count unique groups ──
  const groupCount = useMemo(() => groupedLayers.size, [groupedLayers]);

  // ── Toggle group collapse ──
  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // ── Drag & drop handlers ──
  const handleDragStart = useCallback(
    (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverId(id);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain');
      if (sourceId === targetId) return;

      // Find indices
      const sourceIdx = layers.findIndex((l) => l.id === sourceId);
      const targetIdx = layers.findIndex((l) => l.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return;

      // Determine direction: if dragging from below to above, we need to adjust
      // The array order is bottom-to-top (index 0 = bottom, last = top)
      // Panel shows top-to-bottom (last item first)
      if (sourceIdx < targetIdx) {
        // Source is below target in canvas → move source above target
        moveLayerOrder(sourceId, 'top');
      } else {
        // Source is above target in canvas → move source below target
        moveLayerOrder(sourceId, 'bottom');
      }
      setDragOverId(null);
    },
    [layers, moveLayerOrder],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
  }, []);

  // ── Click on empty area deselects ──
  const handlePanelClick = useCallback(() => {
    selectLayer(null);
  }, [selectLayer]);

  // ── Add a new text layer ──
  const handleAddText = useCallback(() => {
    const newLayer: CanvasLayer = {
      id: `txt_${Date.now()}`,
      name: 'Novo Texto',
      type: 'text',
      x: Math.round(canvasWidth / 2 - 100),
      y: Math.round(canvasHeight / 2 - 20),
      width: 200,
      height: 40,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: 'Texto',
      fontSize: 24,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      color: '#ffffff',
      textAlign: 'center',
    };
    addLayer(newLayer);
    selectLayer(newLayer.id);
  }, [addLayer, selectLayer, canvasWidth, canvasHeight]);

  // ── Add a new shape layer ──
  const handleAddShape = useCallback(() => {
    const newLayer: CanvasLayer = {
      id: `shp_${Date.now()}`,
      name: 'Nova Forma',
      type: 'shape',
      x: Math.round(canvasWidth / 2 - 50),
      y: Math.round(canvasHeight / 2 - 50),
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: '',
      shapeType: 'rectangle',
      backgroundColor: '#6366f1',
    };
    addLayer(newLayer);
    selectLayer(newLayer.id);
  }, [addLayer, selectLayer, canvasWidth, canvasHeight]);

  // ── Render a group section ──
  const renderGroup = useCallback(
    (groupId: string, groupLayers: CanvasLayer[]) => {
      const isCollapsed = collapsedGroups.has(groupId);
      const groupName = groupLayers[0]?.groupId || groupId;

      return (
        <div key={groupId} className="border-b border-white/5">
          {/* Group header */}
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 bg-white/3 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => toggleGroup(groupId)}
          >
            {isCollapsed ? (
              <ChevronRight size={12} className="text-white/40" />
            ) : (
              <ChevronDown size={12} className="text-white/40" />
            )}
            <Group size={12} className="text-green-400/70" />
            <span className="text-[11px] text-white/60 font-medium flex-1">
              {groupName} ({groupLayers.length})
            </span>
          </div>

          {/* Group children */}
          {!isCollapsed &&
            groupLayers.map((layer) => (
              <LayerRow
                key={layer.id}
                layer={layer}
                isSelected={
                  selectedLayerId === layer.id ||
                  selectedLayerIds.includes(layer.id)
                }
                isGrouped
                depth={1}
                dragOverId={dragOverId}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            ))}
        </div>
      );
    },
    [
      collapsedGroups,
      toggleGroup,
      selectedLayerId,
      selectedLayerIds,
      dragOverId,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleDrop,
    ],
  );

  const totalLayers = layers.length;
  const selectedCount = selectedLayerIds.length;

  return (
    <div
      className="flex flex-col h-full bg-[#1a1a2e]/80 text-white select-none"
      onClick={handlePanelClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-blue-400" />
          <span className="text-xs font-semibold">Camadas</span>
          <span className="text-[10px] text-white/30">
            {totalLayers} {totalLayers === 1 ? 'camada' : 'camadas'}
          </span>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-0.5">
          {selectedCount > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  groupSelectedLayers();
                }}
                className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-green-400 transition-colors"
                title="Agrupar selecionadas"
              >
                <Group size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  ungroupSelectedLayers();
                }}
                className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-yellow-400 transition-colors"
                title="Desagrupar"
              >
                <Ungroup size={12} />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddText();
            }}
            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-blue-400 transition-colors"
            title="Adicionar texto"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Selection info bar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-3 py-1 bg-blue-500/10 border-b border-blue-500/20 text-[10px] text-blue-300 shrink-0">
          <span>
            {selectedCount} {selectedCount === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                duplicateLayer(selectedLayerId!);
              }}
              className="p-0.5 hover:bg-white/10 rounded"
              title="Duplicar"
            >
              <Copy size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeLayer(selectedLayerId!);
              }}
              className="p-0.5 hover:bg-red-500/20 rounded text-red-400"
              title="Excluir"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {totalLayers === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Layers size={32} className="text-white/10 mb-3" />
            <p className="text-[11px] text-white/30 leading-relaxed">
              Nenhuma camada ainda.
              <br />
              Adicione texto, formas ou imagens para começar.
            </p>
          </div>
        ) : (
          <>
            {/* Render grouped layers */}
            {Array.from(groupedLayers.entries()).map(([groupId, groupLayers]) =>
              renderGroup(groupId, groupLayers),
            )}

            {/* Render ungrouped layers */}
            {ungroupedLayers.map((layer) => (
              <LayerRow
                key={layer.id}
                layer={layer}
                isSelected={
                  selectedLayerId === layer.id ||
                  selectedLayerIds.includes(layer.id)
                }
                isGrouped={false}
                depth={0}
                dragOverId={dragOverId}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            ))}
          </>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/10 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddText();
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] text-white/50 hover:text-white/80 transition-colors"
          title="Adicionar texto"
        >
          <Type size={10} />
          Texto
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddShape();
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] text-white/50 hover:text-white/80 transition-colors"
          title="Adicionar forma"
        >
          <Square size={10} />
          Forma
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Trigger file upload
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (ev) => {
              const file = (ev.target as HTMLInputElement).files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const newLayer: CanvasLayer = {
                  id: `img_${Date.now()}`,
                  name: file.name.substring(0, 20),
                  type: 'image',
                  x: Math.round(canvasWidth / 2 - 200),
                  y: Math.round(canvasHeight / 2 - 150),
                  width: 400,
                  height: 300,
                  rotation: 0,
                  opacity: 1,
                  visible: true,
                  locked: false,
                  content: reader.result as string,
                };
                addLayer(newLayer);
                selectLayer(newLayer.id);
              };
              reader.readAsDataURL(file);
            };
            input.click();
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] text-white/50 hover:text-white/80 transition-colors"
          title="Adicionar imagem"
        >
          <Image size={10} />
          Imagem
        </button>
      </div>
    </div>
  );
};
