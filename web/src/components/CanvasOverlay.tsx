import React, { useEffect, useRef } from 'react';
import { ScrubberFrame, SvgPathData, ProbeElement, Anomaly } from '../types';

interface CanvasOverlayProps {
  currentFrame?: ScrubberFrame;
  activeAnomalies: Anomaly[];
  showSamMasks: boolean;
  showDomBoxes: boolean;
  showAnomalies: boolean;
  width: number;
  height: number;
}

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  currentFrame,
  activeAnomalies,
  showSamMasks,
  showDomBoxes,
  showAnomalies,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas
    ctx.clearRect(0, 0, width, height);

    if (!currentFrame) return;

    // Render DOM Bounding Boxes (Dashed)
    if (showDomBoxes && currentFrame.probe_elements) {
      currentFrame.probe_elements.forEach((el) => {
        // Normalize coordinates to canvas size (assuming viewport 1200x700 baseline)
        const scaleX = width / 1200;
        const scaleY = height / 700;

        const x = el.x * scaleX;
        const y = el.y * scaleY;
        const w = el.width * scaleX;
        const h = el.height * scaleY;

        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x, y, w, h);

        // Label badge
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = 'rgba(14, 165, 233, 0.9)';
        const tag = el.data_cl || el.id;
        const textWidth = ctx.measureText(tag).width;
        ctx.fillRect(x, Math.max(0, y - 16), textWidth + 8, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(tag, x + 4, Math.max(12, y - 4));
        ctx.restore();
      });
    }

    // Render SAM 3.1 Segmentation Masks (Colored semi-transparent fills & outlines)
    if (showSamMasks && currentFrame.svg_paths) {
      currentFrame.svg_paths.forEach((item) => {
        if (!item.bbox) return;
        const [x1, y1, x2, y2] = item.bbox;
        const scaleX = width / 1200;
        const scaleY = height / 700;

        const x = x1 * scaleX;
        const y = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        ctx.save();
        // Mask fill
        ctx.fillStyle = item.color + '26'; // ~15% opacity
        ctx.fillRect(x, y, w, h);

        // Mask border
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Confidence badge
        ctx.font = 'bold 9px ui-sans-serif, system-ui';
        ctx.fillStyle = item.color;
        const label = `SAM 3.1: ${item.concept} (${Math.round(item.confidence * 100)}%)`;
        const labelWidth = ctx.measureText(label).width;
        ctx.fillRect(x, y + h, labelWidth + 8, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 4, y + h + 11);
        ctx.restore();
      });
    }

    // Render Anomaly Highlights (Vibrant pulsed red outline + danger flag)
    if (showAnomalies && activeAnomalies && activeAnomalies.length > 0) {
      activeAnomalies.forEach((anom) => {
        if (!anom.bbox) return;
        const [x1, y1, x2, y2] = anom.bbox;
        const scaleX = width / 1200;
        const scaleY = height / 700;

        const x = x1 * scaleX;
        const y = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        ctx.save();
        // Red glow
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

        // Anomaly badge
        ctx.font = 'bold 11px ui-sans-serif, system-ui';
        ctx.fillStyle = '#dc2626';
        const text = `⚠️ ANOMALY: ${anom.type.toUpperCase()}`;
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(x, Math.max(0, y - 22), textWidth + 12, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x + 6, Math.max(14, y - 7));
        ctx.restore();
      });
    }
  }, [currentFrame, activeAnomalies, showSamMasks, showDomBoxes, showAnomalies, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-20 w-full h-full object-contain"
    />
  );
};
