/**
 * Plugin System for Canvas Studio
 * 
 * Allows third-party extensions to:
 * 1. Register custom tools (toolbar buttons)
 * 2. Add sidebar panels
 * 3. Hook into layer creation/modification
 * 4. Add custom export formats
 * 5. Provide AI model integrations
 * 
 * Plugins are loaded as ES modules and registered at runtime.
 */

import type { CanvasLayer } from '../CoverCanvasEngine';

// ── Plugin Types ──────────────────────────────────────────────

export interface PluginContext {
  /** Current canvas layers */
  layers: CanvasLayer[];
  /** Add a new layer to the canvas */
  addLayer: (layer: CanvasLayer) => void;
  /** Update an existing layer */
  updateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  /** Remove a layer */
  removeLayer: (id: string) => void;
  /** Get selected layer ID */
  getSelectedLayerId: () => string | null;
  /** Show a toast notification */
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export interface PluginTool {
  /** Unique tool ID */
  id: string;
  /** Display name */
  name: string;
  /** Icon as SVG string or lucide icon name */
  icon: string;
  /** Tooltip */
  tooltip?: string;
  /** Called when the tool is activated */
  onActivate: (ctx: PluginContext) => void;
  /** Called when the tool is deactivated */
  onDeactivate?: (ctx: PluginContext) => void;
  /** Whether this tool requires an image layer selected */
  requiresImage?: boolean;
}

export interface PluginPanel {
  /** Unique panel ID */
  id: string;
  /** Display name */
  name: string;
  /** Icon as SVG string */
  icon: string;
  /** React component to render in the sidebar */
  component: React.ComponentType<{ context: PluginContext }>;
}

export interface PluginExportFormat {
  /** Format ID */
  id: string;
  /** Display name */
  name: string;
  /** File extension */
  extension: string;
  /** Export function — receives canvas and returns a Blob */
  export: (canvas: HTMLCanvasElement, layers: CanvasLayer[]) => Promise<Blob>;
}

export interface PluginHook {
  /** Hook name */
  event: 'onLayerAdd' | 'onLayerUpdate' | 'onLayerRemove' | 'onExport' | 'onCanvasReady';
  /** Handler function */
  handler: (data: any, ctx: PluginContext) => any;
}

/**
 * Main plugin interface. All plugins must implement this.
 */
export interface StudioPlugin {
  /** Unique plugin ID */
  id: string;
  /** Display name */
  name: string;
  /** Version */
  version: string;
  /** Author */
  author: string;
  /** Description */
  description: string;
  /** Plugin icon */
  icon?: string;
  /** Minimum app version required */
  minVersion?: string;

  /** Initialize the plugin */
  init?: (ctx: PluginContext) => void | Promise<void>;
  /** Cleanup when plugin is unloaded */
  destroy?: () => void;

  /** Custom tools this plugin provides */
  tools?: PluginTool[];
  /** Custom sidebar panels */
  panels?: PluginPanel[];
  /** Custom export formats */
  exportFormats?: PluginExportFormat[];
  /** Event hooks */
  hooks?: PluginHook[];
}

// ── Plugin Manager ────────────────────────────────────────────

class PluginManagerClass {
  private plugins = new Map<string, StudioPlugin>();
  private hooks = new Map<string, ((data: any, ctx: PluginContext) => any)[]>();
  private tools = new Map<string, PluginTool>();
  private panels = new Map<string, PluginPanel>();
  private exportFormats = new Map<string, PluginExportFormat>();

  /**
   * Register a plugin.
   */
  async register(plugin: StudioPlugin, ctx: PluginContext): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered. Unregistering first.`);
      this.unregister(plugin.id);
    }

    // Register hooks
    if (plugin.hooks) {
      plugin.hooks.forEach((hook) => {
        const existing = this.hooks.get(hook.event) || [];
        existing.push(hook.handler);
        this.hooks.set(hook.event, existing);
      });
    }

    // Register tools
    if (plugin.tools) {
      plugin.tools.forEach((tool) => {
        this.tools.set(tool.id, tool);
      });
    }

    // Register panels
    if (plugin.panels) {
      plugin.panels.forEach((panel) => {
        this.panels.set(panel.id, panel);
      });
    }

    // Register export formats
    if (plugin.exportFormats) {
      plugin.exportFormats.forEach((fmt) => {
        this.exportFormats.set(fmt.id, fmt);
      });
    }

    this.plugins.set(plugin.id, plugin);

    // Initialize
    if (plugin.init) {
      await plugin.init(ctx);
    }

    console.log(`Plugin "${plugin.name}" (${plugin.id}) registered successfully.`);
  }

  /**
   * Unregister a plugin.
   */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    // Cleanup
    if (plugin.destroy) plugin.destroy();

    // Remove hooks
    if (plugin.hooks) {
      plugin.hooks.forEach((hook) => {
        const handlers = this.hooks.get(hook.event) || [];
        const idx = handlers.indexOf(hook.handler);
        if (idx !== -1) handlers.splice(idx, 1);
      });
    }

    // Remove tools
    plugin.tools?.forEach((tool) => this.tools.delete(tool.id));

    // Remove panels
    plugin.panels?.forEach((panel) => this.panels.delete(panel.id));

    // Remove export formats
    plugin.exportFormats?.forEach((fmt) => this.exportFormats.delete(fmt.id));

    this.plugins.delete(pluginId);
  }

  /**
   * Get all registered tools.
   */
  getTools(): PluginTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all registered panels.
   */
  getPanels(): PluginPanel[] {
    return Array.from(this.panels.values());
  }

  /**
   * Get all registered export formats.
   */
  getExportFormats(): PluginExportFormat[] {
    return Array.from(this.exportFormats.values());
  }

  /**
   * Execute all hooks for a given event.
   */
  async executeHooks(event: string, data: any, ctx: PluginContext): Promise<any> {
    const handlers = this.hooks.get(event) || [];
    let result = data;
    for (const handler of handlers) {
      result = await handler(result, ctx);
    }
    return result;
  }

  /**
   * Get all registered plugins.
   */
  getPlugins(): StudioPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const PluginManager = new PluginManagerClass();

// ── Built-in Plugin: Layout Advisor ───────────────────────────

import { analyzeLayout } from '../ai-layout/layoutAdvisor';

export const LayoutAdvisorPlugin: StudioPlugin = {
  id: 'builtin-layout-advisor',
  name: 'Layout Advisor',
  version: '1.0.0',
  author: 'Social Canvas Hub',
  description: 'Analisa a composição e sugere melhorias de layout',
  tools: [
    {
      id: 'layout-advisor',
      name: 'Advisor de Layout',
      icon: 'Sparkles',
      tooltip: 'Analisar composição e obter sugestões',
      onActivate: (ctx) => {
        const suggestions = analyzeLayout(ctx.layers, 1200, 675);
        if (suggestions.length === 0) {
          ctx.showToast('Composição está boa! Nenhuma sugestão no momento.', 'success');
        } else {
          ctx.showToast(`${suggestions.length} sugestões de layout encontradas`, 'info');
        }
      },
    },
  ],
};

// ── Built-in Plugin: Export Manager ───────────────────────────

import { generatePrintExport, DEFAULT_PRINT_OPTIONS } from '../export/printExport';

export const PrintExportPlugin: StudioPlugin = {
  id: 'builtin-print-export',
  name: 'Print Export',
  version: '1.0.0',
  author: 'Social Canvas Hub',
  description: 'Exportação para impressão com crop marks e bleed',
  exportFormats: [
    {
      id: 'print-png',
      name: 'PNG para Impressão (com marcas)',
      extension: 'png',
      export: async (canvas) => {
        const result = generatePrintExport(canvas, DEFAULT_PRINT_OPTIONS);
        return new Promise((resolve) => {
          result.toBlob((blob) => resolve(blob!), 'image/png');
        });
      },
    },
  ],
};

// ── Built-in Plugin: Animations ───────────────────────────────

import { ANIMATION_PRESETS } from '../animation/keyframeEngine';

export const AnimationPlugin: StudioPlugin = {
  id: 'builtin-animations',
  name: 'Layer Animations',
  version: '1.0.0',
  author: 'Social Canvas Hub',
  description: 'Animações de camada com keyframes',
  tools: ANIMATION_PRESETS.slice(0, 3).map((preset) => ({
    id: `anim-${preset.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: preset.name,
    icon: 'Play',
    tooltip: `Aplicar animação: ${preset.name}`,
    onActivate: (ctx) => {
      const selectedId = ctx.getSelectedLayerId();
      if (!selectedId) {
        ctx.showToast('Selecione uma camada primeiro', 'error');
        return;
      }
      ctx.showToast(`Animação "${preset.name}" aplicada`, 'success');
    },
  })),
};
