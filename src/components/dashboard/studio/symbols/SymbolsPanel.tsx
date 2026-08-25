/**
 * Symbols Panel — Manage reusable layer compositions
 */

import { useState, useCallback } from 'react';
import { Plus, Copy, Trash2, Save, Layers, Tag } from 'lucide-react';
import { useEditor } from '../EditorContext';
import {
  type SymbolDefinition,
  createSymbolFromLayers,
  expandSymbolInstance,
  saveSymbolsToStorage,
  loadSymbolsFromStorage,
  generateSymbolThumbnail,
  BUILTIN_SYMBOLS,
} from './symbolManager';
import type { CanvasLayer } from '../CoverCanvasEngine';

export const SymbolsPanel = () => {
  const { layers, selectedLayerIds, addLayers } = useEditor();
  const [symbols, setSymbols] = useState<SymbolDefinition[]>(() => {
    const stored = loadSymbolsFromStorage();
    // Merge with built-in symbols (don't overwrite user's)
    const userIds = new Set(stored.map((s) => s.id));
    const builtins = BUILTIN_SYMBOLS.filter((b) => !userIds.has(b.id));
    return [...builtins, ...stored];
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');

  const createSymbol = useCallback(() => {
    const selected = layers.filter((l) => selectedLayerIds.includes(l.id));
    if (selected.length === 0 || !newName.trim()) return;

    const symbol = createSymbolFromLayers(
      selected,
      newName.trim(),
      newTags.split(',').map((t) => t.trim()).filter(Boolean),
    );
    symbol.thumbnail = generateSymbolThumbnail(symbol);

    const updated = [...symbols, symbol];
    setSymbols(updated);
    saveSymbolsToStorage(updated.filter((s) => !BUILTIN_SYMBOLS.some((b) => b.id === s.id)));
    setNewName('');
    setNewTags('');
    setShowCreate(false);
  }, [layers, selectedLayerIds, newName, newTags, symbols]);

  const placeSymbol = useCallback((symbol: SymbolDefinition) => {
    const instanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const instance = {
      symbolId: symbol.id,
      instanceId,
      x: Math.round((1200 - symbol.width) / 2),
      y: Math.round((675 - symbol.height) / 2),
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
    };

    const newLayers = expandSymbolInstance(symbol, instance);
    addLayers(newLayers);
  }, [addLayers]);

  const deleteSymbol = useCallback((symbolId: string) => {
    const updated = symbols.filter((s) => s.id !== symbolId);
    setSymbols(updated);
    saveSymbolsToStorage(updated.filter((s) => !BUILTIN_SYMBOLS.some((b) => b.id === s.id)));
  }, [symbols]);

  return (
    <div className="flex flex-col gap-2 text-white p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={12} /> Símbolos
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="p-1 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="Criar símbolo da seleção"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white/5 border border-white/10 p-2 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do símbolo"
            className="w-full h-7 bg-white/5 border border-white/10 px-2 text-[10px] text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags (separadas por vírgula)"
            className="w-full h-7 bg-white/5 border border-white/10 px-2 text-[10px] text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-1">
            <button
              onClick={createSymbol}
              disabled={!newName.trim() || selectedLayerIds.length === 0}
              className="flex-1 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] hover:bg-blue-500/30 disabled:opacity-30 transition-colors flex items-center justify-center gap-1"
            >
              <Save size={10} /> Salvar ({selectedLayerIds.length} camadas)
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="py-1.5 px-2 bg-white/5 border border-white/10 text-white/50 text-[10px] hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Symbols list */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {symbols.map((symbol) => (
          <div
            key={symbol.id}
            className="bg-white/5 border border-white/10 p-2 hover:border-white/20 transition-colors group"
          >
            <div className="flex items-start gap-2">
              {/* Thumbnail */}
              <div className="w-16 h-10 bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {symbol.thumbnail ? (
                  <img src={symbol.thumbnail} alt={symbol.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <Layers size={16} className="text-white/20" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/90 font-medium truncate">{symbol.name}</p>
                <p className="text-[9px] text-white/40">
                  {symbol.layers.length} camadas • {Math.round(symbol.width)}×{Math.round(symbol.height)}
                </p>
                {symbol.tags.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {symbol.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[7px] bg-white/10 px-1 py-0.5 text-white/40">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => placeSymbol(symbol)}
                  className="p-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                  title="Posicionar no canvas"
                >
                  <Copy size={10} />
                </button>
                {!BUILTIN_SYMBOLS.some((b) => b.id === symbol.id) && (
                  <button
                    onClick={() => deleteSymbol(symbol.id)}
                    className="p-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Excluir símbolo"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {symbols.length === 0 && (
          <p className="text-[10px] text-white/30 text-center py-4">
            Nenhum símbolo salvo. Selecione camadas e clique + para criar.
          </p>
        )}
      </div>
    </div>
  );
};
