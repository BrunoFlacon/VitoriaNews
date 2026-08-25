/**
 * Plugin Manager Panel — View and manage installed plugins
 */

import { useState, useCallback } from 'react';
import { Puzzle, Power, Info, ExternalLink } from 'lucide-react';
import { PluginManager, type StudioPlugin, LayoutAdvisorPlugin, PrintExportPlugin, AnimationPlugin } from './pluginManager';
import { useEditor } from '../EditorContext';

export const PluginManagerPanel = () => {
  const editorCtx = useEditor();
  const [plugins, setPlugins] = useState<StudioPlugin[]>(PluginManager.getPlugins());

  const pluginContext = {
    layers: editorCtx.layers,
    addLayer: editorCtx.addLayer,
    updateLayer: editorCtx.updateLayer,
    removeLayer: editorCtx.removeLayer,
    getSelectedLayerId: () => editorCtx.selectedLayerId,
    showToast: (msg: string, _type?: string) => {
      console.log(`[Plugin Toast] ${msg}`);
    },
  };

  const handleRegisterBuiltin = useCallback(async (plugin: StudioPlugin) => {
    try {
      await PluginManager.register(plugin, pluginContext);
      setPlugins(PluginManager.getPlugins());
    } catch (e) {
      console.error('Failed to register plugin:', e);
    }
  }, [pluginContext]);

  const handleUnregister = useCallback((pluginId: string) => {
    PluginManager.unregister(pluginId);
    setPlugins(PluginManager.getPlugins());
  }, []);

  // Check which built-in plugins are not yet registered
  const builtins = [
    { id: 'builtin-layout-advisor', name: 'Layout Advisor', desc: 'Análise de composição com IA' },
    { id: 'builtin-print-export', name: 'Print Export', desc: 'Exportação para impressão com marcas' },
    { id: 'builtin-animations', name: 'Animations', desc: 'Animações de camada com keyframes' },
  ];

  const registeredIds = new Set(plugins.map((p) => p.id));

  return (
    <div className="flex flex-col gap-2 text-white p-3">
      <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
        <Puzzle size={12} /> Plugins
      </h3>

      {/* Built-in plugins */}
      <div className="space-y-1">
        <p className="text-[9px] text-white/40 uppercase tracking-wider">Plugins Internos</p>
        {builtins.map((b) => {
          const isRegistered = registeredIds.has(b.id);
          return (
            <div key={b.id} className="bg-white/5 border border-white/10 p-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-white/90">{b.name}</p>
                <p className="text-[9px] text-white/40">{b.desc}</p>
              </div>
              <button
                onClick={() => isRegistered ? handleUnregister(b.id) : handleRegisterBuiltin(
                  b.id === 'builtin-layout-advisor'
                    ? LayoutAdvisorPlugin
                    : b.id === 'builtin-print-export'
                    ? PrintExportPlugin
                    : AnimationPlugin
                )}
                className={`px-2 py-1 text-[9px] border transition-colors flex items-center gap-1 ${
                  isRegistered
                    ? 'bg-green-500/20 border-green-500/30 text-green-300'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                }`}
              >
                <Power size={10} />
                {isRegistered ? 'Ativo' : 'Ativar'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Registered plugins */}
      {plugins.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] text-white/40 uppercase tracking-wider">Ativos</p>
          {plugins.map((plugin) => (
            <div key={plugin.id} className="bg-white/5 border border-white/10 p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-white/90">{plugin.name}</p>
                  <p className="text-[9px] text-white/40">
                    v{plugin.version} • {plugin.author}
                  </p>
                </div>
                <span className="text-[8px] bg-green-500/20 text-green-300 px-1.5 py-0.5">ATIVO</span>
              </div>
              {plugin.description && (
                <p className="text-[9px] text-white/50 mt-1">{plugin.description}</p>
              )}
              <div className="flex gap-2 mt-1 text-[8px] text-white/30">
                {plugin.tools && plugin.tools.length > 0 && (
                  <span>{plugin.tools.length} ferramenta(s)</span>
                )}
                {plugin.panels && plugin.panels.length > 0 && (
                  <span>{plugin.panels.length} painel(is)</span>
                )}
                {plugin.exportFormats && plugin.exportFormats.length > 0 && (
                  <span>{plugin.exportFormats.length} formato(s)</span>
                )}
                {plugin.hooks && plugin.hooks.length > 0 && (
                  <span>{plugin.hooks.length} hook(s)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How to add custom plugins */}
      <div className="bg-white/5 border border-white/10 p-2">
        <p className="text-[9px] text-white/40 uppercase font-bold mb-1 flex items-center gap-1">
          <Info size={10} /> Como adicionar plugins
        </p>
        <p className="text-[9px] text-white/50 leading-relaxed">
          Crie um arquivo TypeScript que exporta um objeto <code className="text-blue-400">StudioPlugin</code> e
          registre usando <code className="text-blue-400">PluginManager.register()</code>.
        </p>
        <p className="text-[9px] text-white/50 leading-relaxed mt-1">
          Plugins podem adicionar ferramentas, painéis, formatos de export e hooks de eventos.
        </p>
      </div>
    </div>
  );
};
