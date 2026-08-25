/**
 * Print Export Panel
 * 
 * Configure and export canvas designs for professional print.
 */

import { useState, useCallback, useRef } from 'react';
import { Printer, Download, Settings, Info } from 'lucide-react';
import {
  type PrintExportOptions,
  DEFAULT_PRINT_OPTIONS,
  PAPER_SIZES,
  generatePrintExport,
  getPrintSpecsSummary,
  mmToPixels,
} from './printExport';

interface PrintExportPanelProps {
  onExport?: (dataUrl: string) => void;
}

export const PrintExportPanel = ({ onExport }: PrintExportPanelProps) => {
  const [options, setOptions] = useState<PrintExportOptions>(DEFAULT_PRINT_OPTIONS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const specs = getPrintSpecsSummary(options);

  const handleExport = useCallback(() => {
    // Get the design canvas from the engine
    const canvasEl = document.querySelector('canvas');
    if (!canvasEl) return;

    const printCanvas = generatePrintExport(canvasEl, options);

    // Trigger download
    const link = document.createElement('a');
    link.download = `design-impressao-${options.documentWidthMm}x${options.documentHeightMm}mm.${options.format}`;
    link.href = printCanvas.toDataURL(options.format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
    link.click();

    onExport?.(link.href);
  }, [options, onExport]);

  return (
    <div className="flex flex-col gap-3 text-white p-3">
      <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
        <Printer size={12} /> Exportar para Impressão
      </h3>

      {/* Paper Size */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/50">Tamanho do Papel</label>
        <select
          value={`${options.documentWidthMm}x${options.documentHeightMm}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            setOptions((prev) => ({ ...prev, documentWidthMm: w, documentHeightMm: h }));
          }}
          className="w-full h-8 bg-white/5 border border-white/10 px-2 text-xs text-white"
        >
          {PAPER_SIZES.map((ps) => (
            <option key={ps.name} value={`${ps.width}x${ps.height}`} className="bg-[#1E1E2D]">
              {ps.name}
            </option>
          ))}
          <option value={`${options.documentWidthMm}x${options.documentHeightMm}`} className="bg-[#1E1E2D]">
            Personalizado ({options.documentWidthMm}×{options.documentHeightMm}mm)
          </option>
        </select>
      </div>

      {/* Custom dimensions */}
      {options.documentWidthMm !== options.documentHeightMm && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] text-white/40">Largura (mm)</label>
            <input
              type="number"
              value={options.documentWidthMm}
              onChange={(e) => setOptions((prev) => ({ ...prev, documentWidthMm: Number(e.target.value) }))}
              className="w-full h-7 bg-white/5 border border-white/10 text-[10px] text-white font-mono text-center"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-white/40">Altura (mm)</label>
            <input
              type="number"
              value={options.documentHeightMm}
              onChange={(e) => setOptions((prev) => ({ ...prev, documentHeightMm: Number(e.target.value) }))}
              className="w-full h-7 bg-white/5 border border-white/10 text-[10px] text-white font-mono text-center"
            />
          </div>
        </div>
      )}

      {/* Bleed */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/50">Sangria (Bleed): {options.bleedMm}mm</label>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={options.bleedMm}
          onChange={(e) => setOptions((prev) => ({ ...prev, bleedMm: Number(e.target.value) }))}
          className="w-full accent-blue-500"
        />
      </div>

      {/* DPI */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/50">Resolução: {options.dpi} DPI</label>
        <div className="flex gap-1">
          {[72, 150, 300, 600].map((dpi) => (
            <button
              key={dpi}
              onClick={() => setOptions((prev) => ({ ...prev, dpi }))}
              className={`flex-1 py-1 text-[9px] border transition-colors ${
                options.dpi === dpi
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              {dpi}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle marks */}
      <div className="space-y-1.5">
        <label className="text-[9px] text-white/40 uppercase tracking-wider">Marcas</label>
        {[
          { key: 'showCropMarks' as const, label: 'Marcas de Corte' },
          { key: 'showRegistrationMarks' as const, label: 'Marcas de Registro' },
          { key: 'showColorBars' as const, label: 'Barras de Cor' },
          { key: 'showSafeZone' as const, label: 'Zona Segura' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[10px] text-white/60">{label}</span>
            <button
              onClick={() => setOptions((prev) => ({ ...prev, [key]: !prev[key] }))}
              className={`w-7 h-3.5 relative cursor-pointer transition-colors ${
                options[key] ? 'bg-blue-600' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 bg-white absolute top-0.5 shadow-sm transition-transform ${
                  options[key] ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
      >
        <Settings size={10} /> Opções Avançadas
      </button>

      {showAdvanced && (
        <div className="space-y-2 bg-white/5 border border-white/10 p-2">
          <div className="space-y-1">
            <label className="text-[9px] text-white/40">Zona Segura (mm)</label>
            <input
              type="number"
              min={0}
              max={20}
              value={options.safeZoneMm}
              onChange={(e) => setOptions((prev) => ({ ...prev, safeZoneMm: Number(e.target.value) }))}
              className="w-full h-7 bg-white/5 border border-white/10 text-[10px] text-white font-mono text-center"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-white/40">Formato</label>
            <div className="flex gap-1">
              {(['png', 'jpg', 'tiff'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOptions((prev) => ({ ...prev, format: fmt }))}
                  className={`flex-1 py-1 text-[9px] border uppercase transition-colors ${
                    options.format === fmt
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Print Specs Summary */}
      <div className="bg-white/5 border border-white/10 p-2 space-y-1">
        <p className="text-[9px] text-white/40 uppercase font-bold">Resumo da Impressão</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
          <span className="text-white/50">Design:</span>
          <span className="text-white/80 font-mono">{specs.designWidthPx}×{specs.designHeightPx}px</span>
          <span className="text-white/50">Total (c/ sangria):</span>
          <span className="text-white/80 font-mono">{specs.totalWidthPx}×{specs.totalHeightPx}px</span>
          <span className="text-white/50">Tamanho real:</span>
          <span className="text-white/80 font-mono">{specs.totalWidthMm}×{specs.totalHeightMm}mm</span>
          <span className="text-white/50">Sangria:</span>
          <span className="text-white/80 font-mono">{options.bleedMm}mm ({specs.bleedPx}px)</span>
          <span className="text-white/50">Tamanho arquivo:</span>
          <span className="text-white/80 font-mono">~{specs.fileSizeEstimateMB}MB</span>
        </div>
      </div>

      {/* CMYK notice */}
      <div className="flex gap-2 bg-yellow-500/10 border border-yellow-500/20 p-2">
        <Info size={14} className="text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-yellow-300/80 leading-relaxed">
          Este export é em <strong>sRGB</strong>. Para impressão profissional CMYK, envie o arquivo
          PNG/JPG para uma gráfica que converte para CMYK automaticamente, ou use um perfil ICC CMYK.
        </p>
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-green-600 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:from-blue-500 hover:to-green-500 transition-all"
      >
        <Download size={14} /> Exportar para Impressão
      </button>
    </div>
  );
};
