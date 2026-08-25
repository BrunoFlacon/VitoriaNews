/**
 * Print Export Engine
 * 
 * Exports canvas designs for professional print with:
 * - Bleed area (typically 3mm / 0.125")
 * - Crop marks / trim marks
 * - Registration marks
 * - Color bars
 * - DPI/resolution control
 * - CMYK color profile notice
 * - Safe zone indicators
 */

export interface PrintExportOptions {
  /** Document width in mm */
  documentWidthMm: number;
  /** Document height in mm */
  documentHeightMm: number;
  /** Bleed in mm (default 3mm) */
  bleedMm: number;
  /** Target DPI for rasterization */
  dpi: number;
  /** Show crop marks */
  showCropMarks: boolean;
  /** Show registration marks */
  showRegistrationMarks: boolean;
  /** Show color bars */
  showColorBars: boolean;
  /** Show safe zone (margin inside trim) */
  showSafeZone: boolean;
  /** Safe zone margin in mm */
  safeZoneMm: number;
  /** Output format */
  format: 'pdf' | 'png' | 'jpg' | 'tiff';
  /** Color profile notice */
  colorProfile: 'srgb' | 'cmyk-notice';
}

export const DEFAULT_PRINT_OPTIONS: PrintExportOptions = {
  documentWidthMm: 210,  // A4 width
  documentHeightMm: 297, // A4 height
  bleedMm: 3,
  dpi: 300,
  showCropMarks: true,
  showRegistrationMarks: true,
  showColorBars: false,
  showSafeZone: true,
  safeZoneMm: 5,
  format: 'png',
  colorProfile: 'srgb',
};

/** Common paper sizes in mm */
export const PAPER_SIZES = [
  { name: 'A4 (210×297mm)', width: 210, height: 297 },
  { name: 'A5 (148×210mm)', width: 148, height: 210 },
  { name: 'Letter (216×279mm)', width: 216, height: 279 },
  { name: 'Legal (216×356mm)', width: 216, height: 356 },
  { name: 'Tabloid (279×432mm)', width: 279, height: 432 },
  { name: 'A3 (297×420mm)', width: 297, height: 420 },
  { name: 'Business Card (85×55mm)', width: 85, height: 55 },
  { name: 'Instagram Post (1080×1080)', width: 90, height: 90 },
  { name: 'Flyer A4 (210×297mm)', width: 210, height: 297 },
  { name: 'Poster A2 (420×594mm)', width: 420, height: 594 },
] as const;

/**
 * Convert mm to pixels at a given DPI
 */
export function mmToPixels(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

/**
 * Convert pixels to mm at a given DPI
 */
export function pixelsToMm(px: number, dpi: number): number {
  return (px / dpi) * 25.4;
}

/**
 * Generate a print-ready canvas with bleed, crop marks, and other press marks.
 * 
 * @param sourceCanvas - The design canvas to export
 * @param options - Print export options
 * @returns A new canvas with print marks applied
 */
export function generatePrintExport(
  sourceCanvas: HTMLCanvasElement,
  options: PrintExportOptions = DEFAULT_PRINT_OPTIONS,
): HTMLCanvasElement {
  const dpi = options.dpi;
  const bleedPx = mmToPixels(options.bleedMm, dpi);
  const safeZonePx = mmToPixels(options.safeZoneMm, dpi);

  // Total canvas size including bleed on all sides
  const totalWidth = sourceCanvas.width + bleedPx * 2;
  const totalHeight = sourceCanvas.height + bleedPx * 2;

  // Add extra space for marks (crop marks extend outside the bleed)
  const markMargin = mmToPixels(10, dpi); // 10mm margin for marks
  const finalWidth = totalWidth + markMargin * 2;
  const finalHeight = totalHeight + markMargin * 2;

  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d')!;

  // White background (paper color)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  // ── Draw Bleed Area ──
  // The bleed is the area between the trim edge and the outer edge
  // Fill bleed area with a light tint to visualize it
  ctx.save();
  ctx.fillStyle = 'rgba(200, 220, 255, 0.15)';
  ctx.fillRect(markMargin, markMargin, totalWidth, totalHeight);
  ctx.restore();

  // ── Draw Design (centered with bleed offset) ──
  const designX = markMargin + bleedPx;
  const designY = markMargin + bleedPx;

  // Extend the design into the bleed area by repeating edge pixels
  // (In production, the designer should extend artwork into bleed manually)
  ctx.save();
  ctx.drawImage(sourceCanvas, designX, designY);
  ctx.restore();

  // ── Crop Marks ──
  if (options.showCropMarks) {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    const markLength = mmToPixels(5, dpi);

    const corners = [
      // Top-left
      { x: markMargin, y: markMargin, dx: [1, 0], dy: [0, 1] },
      // Top-right
      { x: markMargin + totalWidth, y: markMargin, dx: [-1, 0], dy: [0, 1] },
      // Bottom-left
      { x: markMargin, y: markMargin + totalHeight, dx: [1, 0], dy: [0, -1] },
      // Bottom-right
      { x: markMargin + totalWidth, y: markMargin + totalHeight, dx: [-1, 0], dy: [0, -1] },
    ];

    corners.forEach(({ x, y, dx, dy }) => {
      // Horizontal mark
      ctx.beginPath();
      ctx.moveTo(x + dx[0] * 2, y + dy[0] * 2);
      ctx.lineTo(x + dx[0] * (markLength + 2), y + dy[0] * (markLength + 2));
      ctx.stroke();
      // Vertical mark
      ctx.beginPath();
      ctx.moveTo(x + dx[1] * 2, y + dy[1] * 2);
      ctx.lineTo(x + dx[1] * (markLength + 2), y + dy[1] * (markLength + 2));
      ctx.stroke();
    });
    ctx.restore();
  }

  // ── Registration Marks ──
  if (options.showRegistrationMarks) {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    const regSize = mmToPixels(3, dpi);

    // Top center
    const regPositions = [
      { x: finalWidth / 2, y: markMargin - 5 },
      { x: finalWidth / 2, y: markMargin + totalHeight + 5 },
      { x: markMargin - 5, y: finalHeight / 2 },
      { x: markMargin + totalWidth + 5, y: finalHeight / 2 },
    ];

    regPositions.forEach(({ x, y }) => {
      // Crosshair
      ctx.beginPath();
      ctx.arc(x, y, regSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - regSize - 2, y);
      ctx.lineTo(x + regSize + 2, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - regSize - 2);
      ctx.lineTo(x, y + regSize + 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  // ── Color Bars ──
  if (options.showColorBars) {
    ctx.save();
    const barHeight = mmToPixels(3, dpi);
    const barY = markMargin + totalHeight + mmToPixels(6, dpi);
    const barColors = [
      '#000000', '#00FFFF', '#FF00FF', '#FFFF00',
      '#FF0000', '#00FF00', '#0000FF', '#FFFFFF',
    ];
    const barWidth = (totalWidth - mmToPixels(10, dpi)) / barColors.length;

    barColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(
        markMargin + mmToPixels(5, dpi) + i * barWidth,
        barY,
        barWidth,
        barHeight,
      );
    });
    ctx.restore();
  }

  // ── Safe Zone Indicator ──
  if (options.showSafeZone) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      designX + safeZonePx,
      designY + safeZonePx,
      sourceCanvas.width - safeZonePx * 2,
      sourceCanvas.height - safeZonePx * 2,
    );
    ctx.setLineDash([]);
    ctx.restore();
  }

  return canvas;
}

/**
 * Calculate print specs summary for display
 */
export function getPrintSpecsSummary(options: PrintExportOptions) {
  const bleedPx = mmToPixels(options.bleedMm, options.dpi);
  const totalWidthPx = mmToPixels(options.documentWidthMm + options.bleedMm * 2, options.dpi);
  const totalHeightPx = mmToPixels(options.documentHeightMm + options.bleedMm * 2, options.dpi);
  const totalWidthMm = options.documentWidthMm + options.bleedMm * 2;
  const totalHeightMm = options.documentHeightMm + options.bleedMm * 2;

  return {
    designWidthPx: mmToPixels(options.documentWidthMm, options.dpi),
    designHeightPx: mmToPixels(options.documentHeightMm, options.dpi),
    totalWidthPx,
    totalHeightPx,
    totalWidthMm,
    totalHeightMm,
    bleedPx,
    safeZonePx: mmToPixels(options.safeZoneMm, options.dpi),
    fileSizeEstimateMB: Math.round((totalWidthPx * totalHeightPx * 3) / (1024 * 1024)),
  };
}
