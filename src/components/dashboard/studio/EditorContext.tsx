// EditorContext - Replaces @lidojs/design-editor's useEditor
// Provides layer management, undo/redo, and canvas state for the studio editor

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import type { CanvasLayer } from '../CoverCanvasEngine';

interface EditorContextValue {
  // Layer state
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  activePage: number;

  // Layer operations
  addLayer: (layer: CanvasLayer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  selectLayer: (id: string | null) => void;
  duplicateLayer: (id: string) => void;
  moveLayerOrder: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;

  // Canvas operations
  setCanvasSize: (width: number, height: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;

  // Image tools
  cutoutMode: boolean;
  setCutoutMode: (active: boolean) => void;
  removeBgProcessing: boolean;
  setRemoveBgProcessing: (processing: boolean) => void;

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
  const [canvasWidth, setCanvasWidth] = useState(initialWidth);
  const [canvasHeight, setCanvasHeight] = useState(initialHeight);
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);
  const [history, setHistory] = useState<CanvasLayer[][]>([initialLayers]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activePage] = useState(0);
  const [cutoutMode, setCutoutMode] = useState(false);
  const [removeBgProcessing, setRemoveBgProcessing] = useState(false);

  const pushHistory = useCallback((newLayers: CanvasLayer[]) => {
    const trimmed = history.slice(0, historyIndex + 1);
    setHistory([...trimmed, newLayers]);
    setHistoryIndex(trimmed.length);
  }, [history, historyIndex]);

  const addLayer = useCallback((layer: CanvasLayer) => {
    setLayers((prev) => {
      const next = [...prev, layer];
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const next = prev.filter((l) => l.id !== id);
      pushHistory(next);
      return next;
    });
    setSelectedLayerId(null);
  }, [pushHistory]);

  const updateLayer = useCallback((id: string, updates: Partial<CanvasLayer>) => {
    setLayers((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, ...updates } : l));
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const selectLayer = useCallback((id: string | null) => {
    setSelectedLayerId(id);
  }, []);

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
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

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
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const setCanvasSize = useCallback((width: number, height: number) => {
    setCanvasWidth(width);
    setCanvasHeight(height);
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setLayers(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setLayers(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  return (
    <EditorContext.Provider
      value={{
        layers,
        selectedLayerId,
        activePage,
        addLayer,
        removeLayer,
        updateLayer,
        selectLayer,
        duplicateLayer,
        moveLayerOrder,
        setCanvasSize,
        canvasWidth,
        canvasHeight,
        backgroundColor,
        setBackgroundColor,
        cutoutMode,
        setCutoutMode,
        removeBgProcessing,
        setRemoveBgProcessing,
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
