// EditorContext - Replaces @lidojs/design-editor's useEditor
// Provides layer management, undo/redo, and canvas state for the studio editor

import { createContext, useContext, useCallback, useState, useRef, useEffect, type ReactNode } from 'react';
import type { CanvasLayer } from '../CoverCanvasEngine';

interface EditorContextValue {
  // Layer state
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  /** IDs of all currently selected layers (multi-select). Always includes selectedLayerId. */
  selectedLayerIds: string[];
  activePage: number;

  // Layer operations
  addLayer: (layer: CanvasLayer) => void;
  addLayers: (layers: CanvasLayer[]) => void;
  removeLayer: (id: string) => void;
  removeSelectedLayers: () => void;
  updateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  updateSelectedLayers: (updates: Partial<CanvasLayer>) => void;
  selectLayer: (id: string | null) => void;
  /** Toggle a layer in/out of the multi-selection. When shiftKey is false, replaces selection. */
  toggleLayerSelection: (id: string, shiftKey?: boolean) => void;
  selectAllLayers: () => void;
  duplicateLayer: (id: string) => void;
  duplicateSelectedLayers: () => void;
  moveLayerOrder: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;

  // Grouping
  groupSelectedLayers: () => void;
  ungroupSelectedLayers: () => void;

  // Bulk replace (for import)
  replaceLayers: (layers: CanvasLayer[]) => void;

  // Canvas operations
  setCanvasSize: (width: number, height: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  backgroundGradient: string | null;
  setBackgroundGradient: (gradient: string | null) => void;

  // Image tools
  cutoutMode: boolean;
  setCutoutMode: (active: boolean) => void;
  removeBgProcessing: boolean;
  setRemoveBgProcessing: (processing: boolean) => void;

  // Eraser tool
  eraserMode: boolean;
  setEraserMode: (active: boolean) => void;
  eraserSize: number;
  setEraserSize: (size: number) => void;
  eraserSoftness: number;
  setEraserSoftness: (softness: number) => void;
  eraserTolerance: number;
  setEraserTolerance: (tolerance: number) => void;
  eraserType: 'basic' | 'magic' | 'pixel';
  setEraserType: (type: 'basic' | 'magic' | 'pixel') => void;

  // Smart selection
  smartSelectionMode: boolean;
  setSmartSelectionMode: (active: boolean) => void;

  // Canvas options
  clipContent: boolean;
  setClipContent: (clip: boolean) => void;

  // Scale all layers proportionally when canvas size changes
  scaleAllLayers: (oldWidth: number, oldHeight: number, newWidth: number, newHeight: number) => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const useEditor = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
};

interface EditorProviderProps {
  children: ReactNode;
  initialLayers?: CanvasLayer[];
  initialWidth?: number;
  initialHeight?: number;
  initialBackgroundColor?: string;
}

export const EditorProvider = ({
  children,
  initialLayers = [],
  initialWidth = 1200,
  initialHeight = 675,
  initialBackgroundColor = '#1a1a2e',
}: EditorProviderProps) => {
  const [layers, setLayers] = useState<CanvasLayer[]>(initialLayers);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(initialWidth);
  const [canvasHeight, setCanvasHeight] = useState(initialHeight);
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);
  const [backgroundGradient, setBackgroundGradient] = useState<string | null>(null);
  const [history, setHistory] = useState<CanvasLayer[][]>([initialLayers]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activePage] = useState(0);
  const [cutoutMode, setCutoutMode] = useState(false);
  const [removeBgProcessing, setRemoveBgProcessing] = useState(false);
  const [clipContent, setClipContent] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [eraserSize, setEraserSize] = useState(20);
  const [eraserSoftness, setEraserSoftness] = useState(50);
  const [eraserTolerance, setEraserTolerance] = useState(30);
  const [eraserType, setEraserType] = useState<'basic' | 'magic' | 'pixel'>('basic');
  const [smartSelectionMode, setSmartSelectionMode] = useState(false);

  // Batch history: collect pending layers, flush after 300ms of inactivity.
  // Uses requestIdleCallback (with setTimeout fallback) to avoid long-task violations.
  const pendingLayersRef = useRef<CanvasLayer[] | null>(null);
  const flushIdRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);

  const pushHistory = useCallback((newLayers: CanvasLayer[]) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, newLayers];
      setHistoryIndex(next.length);
      return next;
    });
  }, [historyIndex]);

  const scheduleHistoryFlush = useCallback(() => {
    if (flushIdRef.current !== null) {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(flushIdRef.current as number);
      else clearTimeout(flushIdRef.current as ReturnType<typeof setTimeout>);
    }
    // Use requestIdleCallback with a 300ms timeout to batch rapid updates.
    // Falls back to setTimeout when requestIdleCallback is not available.
    const flush = () => {
      if (pendingLayersRef.current !== null) {
        pushHistory(pendingLayersRef.current);
        pendingLayersRef.current = null;
      }
      flushIdRef.current = null;
    };
    if (typeof requestIdleCallback !== 'undefined') {
      flushIdRef.current = requestIdleCallback(flush, { timeout: 300 });
    } else {
      // Use requestAnimationFrame instead of setTimeout to avoid violation
      flushIdRef.current = requestAnimationFrame(() => { flush(); });
    }
  }, [pushHistory]);

  // Scale all layers proportionally when canvas size changes
  const scaleAllLayers = useCallback((oldWidth: number, oldHeight: number, newWidth: number, newHeight: number) => {
    if (oldWidth <= 0 || oldHeight <= 0) return;
    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        x: Math.round(l.x * scaleX),
        y: Math.round(l.y * scaleY),
        width: Math.round(l.width * scaleX),
        height: Math.round(l.height * scaleY),
      }))
    );
    setCanvasWidth(newWidth);
    setCanvasHeight(newHeight);
    scheduleHistoryFlush();
  }, [scheduleHistoryFlush]);

  const addLayer = useCallback((layer: CanvasLayer) => {
    setLayers((prev) => {
      const next = [...prev, layer];
      pendingLayersRef.current = next;
      return next;
    });
    scheduleHistoryFlush();
  }, [scheduleHistoryFlush]);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const next = prev.filter((l) => l.id !== id);
      pendingLayersRef.current = next;
      return next;
    });
    setSelectedLayerId((prev) => prev === id ? null : prev);
    setSelectedLayerIds((prev) => prev.filter((sid) => sid !== id));
    scheduleHistoryFlush();
  }, [scheduleHistoryFlush]);

  const updateLayer = useCallback((id: string, updates: Partial<CanvasLayer>) => {
    setLayers((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, ...updates } : l));
      pendingLayersRef.current = next;
      return next;
    });
    scheduleHistoryFlush();
  }, [scheduleHistoryFlush]);

  const selectLayer = useCallback((id: string | null) => {
    setSelectedLayerId(id);
    setSelectedLayerIds(id ? [id] : []);
  }, []);

  const toggleLayerSelection = useCallback((id: string, shiftKey = false) => {
    if (shiftKey) {
      setSelectedLayerIds((prev) => {
        const exists = prev.includes(id);
        const next = exists ? prev.filter((sid) => sid !== id) : [...prev, id];
        setSelectedLayerId(next.length > 0 ? next[next.length - 1] : null);
        return next;
      });
    } else {
      setSelectedLayerId(id);
      setSelectedLayerIds(id ? [id] : []);
    }
  }, []);

  const selectAllLayers = useCallback(() => {
    const visible = layers.filter((l) => l.visible && !l.locked);
    const ids = visible.map((l) => l.id);
    setSelectedLayerIds(ids);
    if (ids.length > 0) setSelectedLayerId(ids[ids.length - 1]);
  }, [layers]);

  const addLayers = useCallback((newLayers: CanvasLayer[]) => {
    setLayers((prev) => {
      const next = [...prev, ...newLayers];
      pendingLayersRef.current = next;
      return next;
    });
    scheduleHistoryFlush();
  }, [scheduleHistoryFlush]);

  const removeSelectedLayers = useCallback(() => {
    setLayers((prev) => {
      const next = prev.filter((l) => !selectedLayerIds.includes(l.id));
      pendingLayersRef.current = next;
      return next;
    });
    setSelectedLayerId(null);
    setSelectedLayerIds([]);
    scheduleHistoryFlush();
  }, [selectedLayerIds, scheduleHistoryFlush]);

  const updateSelectedLayers = useCallback((updates: Partial<CanvasLayer>) => {
    setLayers((prev) => {
      const next = prev.map((l) =>
        selectedLayerIds.includes(l.id) ? { ...l, ...updates } : l
      );
      pendingLayersRef.current = next;
      return next;
    });
    scheduleHistoryFlush();
  }, [selectedLayerIds, scheduleHistoryFlush]);

  const duplicateSelectedLayers = useCallback(() => {
    setLayers((prev) => {
      const toDup = prev.filter((l) => selectedLayerIds.includes(l.id));
      const newLayers = toDup.map((l) => ({
        ...l,
        id: `dup_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        name: `${l.name} (Cópia)`,
        x: l.x + 30,
        y: l.y + 30,
      }));
      const next = [...prev, ...newLayers];
      pendingLayersRef.current = next;
      // Select the duplicated layers
      const newIds = newLayers.map((l) => l.id);
      setSelectedLayerIds(newIds);
      setSelectedLayerId(newIds.length > 0 ? newIds[newIds.length - 1] : null);
      return next;
    });
    scheduleHistoryFlush();
  }, [selectedLayerIds, scheduleHistoryFlush]);

  const duplicateLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const layer = prev.find((l) => l.id === id);
      if (!layer) return prev;
      const dup: CanvasLayer = {
        ...layer,
        id: `dup_${Date.now()}`,
        name: `${layer.name} (Cópia)`,
        x: layer.x + 30,
        y: layer.y + 30,
      };
      const next = [...prev, dup];
      pendingLayersRef.current = next;
      return next;
    });
    scheduleHistoryFlush();
  }, [scheduleHistoryFlush]);

  const moveLayerOrder = useCallback((id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      if (direction === 'up') next.splice(Math.min(prev.length - 1, idx + 1), 0, item);
      else if (direction === 'down') next.splice(Math.max(0, idx - 1), 0, item);
      else if (direction === 'top') next.push(item);
      else if (direction === 'bottom') next.unshift(item);
      pendingLayersRef.current = next;
      return next;
    });
    scheduleHistoryFlush();
  }, [scheduleHistoryFlush]);

  // ── Group / Ungroup ──────────────────────────────────────────────
  const groupSelectedLayers = useCallback(() => {
    if (selectedLayerIds.length < 2) return;
    const groupId = `group_${Date.now()}`;
    setLayers((prev) => {
      const next = prev.map((l) =>
        selectedLayerIds.includes(l.id) ? { ...l, groupId } : l
      );
      pendingLayersRef.current = next;
      return next;
    });
    scheduleHistoryFlush();
  }, [selectedLayerIds, scheduleHistoryFlush]);

  const ungroupSelectedLayers = useCallback(() => {
    const groupIds = new Set<string>();
    layers.forEach((l) => {
      if (selectedLayerIds.includes(l.id) && l.groupId) {
        groupIds.add(l.groupId);
      }
    });
    if (groupIds.size === 0) return;
    setLayers((prev) => {
      const next = prev.map((l) =>
        l.groupId && groupIds.has(l.groupId) ? { ...l, groupId: undefined } : l
      );
      pendingLayersRef.current = next;
      return next;
    });
    scheduleHistoryFlush();
  }, [layers, selectedLayerIds, scheduleHistoryFlush]);

  // ── Bulk replace (for import) ───────────────────────────────────
  const replaceLayers = useCallback((newLayers: CanvasLayer[]) => {
    setLayers(newLayers);
    setSelectedLayerId(null);
    setSelectedLayerIds([]);
    pendingLayersRef.current = newLayers;
    scheduleHistoryFlush();
  }, [scheduleHistoryFlush]);

  const setCanvasSize = useCallback((width: number, height: number) => {
    setCanvasWidth(width);
    setCanvasHeight(height);
  }, []);

  // Keep refs to latest state so undo/redo avoid stale closures
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx > 0) {
      const snap = historyRef.current[idx - 1];
      setHistoryIndex(idx - 1);
      setLayers(snap);
    }
  }, []);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx < historyRef.current.length - 1) {
      const snap = historyRef.current[idx + 1];
      setHistoryIndex(idx + 1);
      setLayers(snap);
    }
  }, []);

  return (
    <EditorContext.Provider
      value={{
        layers,
        selectedLayerId,
        selectedLayerIds,
        activePage,
        addLayer,
        addLayers,
        removeLayer,
        removeSelectedLayers,
        updateLayer,
        updateSelectedLayers,
        selectLayer,
        toggleLayerSelection,
        selectAllLayers,
        duplicateLayer,
        duplicateSelectedLayers,
        moveLayerOrder,
        groupSelectedLayers,
        ungroupSelectedLayers,
        replaceLayers,
        setCanvasSize,
        canvasWidth,
        canvasHeight,
        backgroundColor,
        setBackgroundColor,
        backgroundGradient,
        setBackgroundGradient,
        cutoutMode,
        setCutoutMode,
        removeBgProcessing,
        setRemoveBgProcessing,
        eraserMode,
        setEraserMode,
        eraserSize,
        setEraserSize,
        eraserSoftness,
        setEraserSoftness,
        eraserTolerance,
        setEraserTolerance,
        eraserType,
        setEraserType,
        smartSelectionMode,
        setSmartSelectionMode,
        clipContent,
        setClipContent,
        scaleAllLayers,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        undo,
        redo,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};
