import React, { useRef, useEffect, useState } from 'react';
import {
  PlayIcon,
  PauseIcon,
  StepBackIcon,
  StepForwardIcon,
  LayersIcon,
  AlertTriangleIcon,
  EyeIcon,
} from './icons';
import { CanvasOverlay } from './CanvasOverlay';
import { ScrubberSession, ScrubberFrame, Anomaly } from '../types';

interface VideoPlayerProps {
  session: ScrubberSession;
  currentTimestampMs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeekMs: (ms: number) => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  currentFrame?: ScrubberFrame;
  activeAnomalies: Anomaly[];
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  session,
  currentTimestampMs,
  isPlaying,
  onTogglePlay,
  onSeekMs,
  playbackSpeed,
  onChangeSpeed,
  currentFrame,
  activeAnomalies,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [showSamMasks, setShowSamMasks] = useState<boolean>(true);
  const [showDomBoxes, setShowDomBoxes] = useState<boolean>(true);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 480,
  });
  const [videoError, setVideoError] = useState<boolean>(false);

  // Sync video time when currentTimestampMs changes externally (e.g. from scrubber)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const targetSec = currentTimestampMs / 1000;
    if (Math.abs(video.currentTime - targetSec) > 0.08) {
      video.currentTime = targetSec;
    }
  }, [currentTimestampMs]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Play / Pause sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Handle video timeupdate
  const handleTimeUpdate = () => {
    if (!videoRef.current || !isPlaying) return;
    onSeekMs(Math.round(videoRef.current.currentTime * 1000));
  };

  // Resize observer to scale overlay canvas with responsive video container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setDimensions({
        width: container.clientWidth || 800,
        height: container.clientHeight || 480,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const totalDurationMs = session.duration_s * 1000;
  const frameIntervalMs = 1000 / (session.fps || 30);
  const currentFrameIndex = Math.min(
    session.frame_count - 1,
    Math.floor(currentTimestampMs / frameIntervalMs)
  );

  const formatTime = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const millis = Math.floor(ms % 1000);
    return `00:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  return (
    <div className="bg-obsidian-surface rounded-xl border border-obsidian-subtle shadow-xl overflow-hidden flex flex-col">
      {/* Top Video Toolbar */}
      <div className="px-3.5 py-2 bg-obsidian-panel border-b border-obsidian-subtle flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-brand" />
          <span className="font-mono text-xs uppercase font-semibold text-ink-primary">
            {session.bug_title}
          </span>
          <span className="text-ink-tertiary text-[11px] font-mono">
            ({session.fps} FPS · H.264 MP4)
          </span>
        </div>

        {/* Technical Layer Toggles */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <button
            onClick={() => setShowSamMasks(!showSamMasks)}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              showSamMasks
                ? 'bg-amber-brand/15 text-amber-brand border border-amber-brand/30'
                : 'text-ink-tertiary hover:text-ink-secondary bg-obsidian-canvas border border-obsidian-subtle'
            }`}
            title="Toggle Meta SAM 3.1 Segmentation Masks"
          >
            <LayersIcon size={12} />
            <span>SAM 3.1</span>
          </button>

          <button
            onClick={() => setShowDomBoxes(!showDomBoxes)}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              showDomBoxes
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-ink-tertiary hover:text-ink-secondary bg-obsidian-canvas border border-obsidian-subtle'
            }`}
            title="Toggle DOM Probe Bounding Boxes"
          >
            <EyeIcon size={12} />
            <span>DOM PROBE</span>
          </button>

          <button
            onClick={() => setShowAnomalies(!showAnomalies)}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              showAnomalies
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'text-ink-tertiary hover:text-ink-secondary bg-obsidian-canvas border border-obsidian-subtle'
            }`}
            title="Toggle Anomaly Halos"
          >
            <AlertTriangleIcon size={12} />
            <span>ANOMALIES</span>
          </button>
        </div>
      </div>

      {/* Video Viewport with Canvas Overlay */}
      <div
        ref={containerRef}
        className="relative aspect-video bg-[#050608] flex items-center justify-center overflow-hidden select-none"
      >
        {session.video_url && !videoError ? (
          <video
            ref={videoRef}
            src={session.video_url}
            onTimeUpdate={handleTimeUpdate}
            onError={() => setVideoError(true)}
            onEnded={() => onTogglePlay()}
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        ) : (
          /* High-Fidelity Synthetic Simulation Viewport */
          <div className="w-full h-full flex flex-col items-center justify-center bg-obsidian-canvas p-6 text-center select-none border border-obsidian-subtle/40">
            <div className="w-12 h-12 rounded-lg bg-obsidian-panel border border-obsidian-border flex items-center justify-center mb-2.5 text-amber-brand">
              <LayersIcon size={24} />
            </div>
            <h3 className="text-sm font-semibold text-ink-primary font-mono mb-1">
              {session.bug_title.toUpperCase()} (PERCEPTION VIEWPORT)
            </h3>
            <p className="text-xs text-ink-secondary max-w-md mb-2.5">
              Synchronized frame-by-frame pipeline stepping with SAM 3.1 pixel masks and DOM telemetry.
            </p>
            <div className="flex items-center gap-3 text-[11px] font-mono text-ink-tertiary">
              <span>T: {currentTimestampMs}ms</span>
              <span>•</span>
              <span>FRAME: {currentFrameIndex}</span>
            </div>
          </div>
        )}

        {/* Segmentation & DOM Overlay */}
        <CanvasOverlay
          currentFrame={currentFrame}
          activeAnomalies={showAnomalies ? activeAnomalies : []}
          showSamMasks={showSamMasks}
          showDomBoxes={showDomBoxes}
          showAnomalies={showAnomalies}
          width={dimensions.width}
          height={dimensions.height}
        />

        {/* Active Anomaly Banner Overlay */}
        {activeAnomalies.length > 0 && showAnomalies && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-2.5 py-1 bg-rose-950/90 text-rose-200 rounded border border-rose-600/70 shadow-lg text-[11px] font-mono font-semibold">
            <AlertTriangleIcon size={13} className="text-rose-400" />
            <span>ANOMALY: {activeAnomalies[0].type.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Control Transport Bar */}
      <div className="px-3.5 py-2.5 bg-obsidian-panel border-t border-obsidian-subtle flex items-center justify-between gap-4">
        {/* Playback Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Step Back -1 Frame */}
          <button
            onClick={() => onSeekMs(Math.max(0, currentTimestampMs - frameIntervalMs))}
            className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-obsidian-elevated rounded transition-colors"
            title="Step back 1 frame (-33ms)"
          >
            <StepBackIcon size={15} />
          </button>

          {/* Play / Pause (Crisp Amber) */}
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-md bg-amber-brand hover:bg-amber-hover text-obsidian-canvas flex items-center justify-center transition-all shadow-sm active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon size={14} className="fill-current" /> : <PlayIcon size={14} className="fill-current ml-0.5" />}
          </button>

          {/* Step Forward +1 Frame */}
          <button
            onClick={() => onSeekMs(Math.min(totalDurationMs, currentTimestampMs + frameIntervalMs))}
            className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-obsidian-elevated rounded transition-colors"
            title="Step forward 1 frame (+33ms)"
          >
            <StepForwardIcon size={15} />
          </button>

          {/* Time & Frame Counter */}
          <div className="ml-3 font-mono text-xs flex items-center gap-1.5">
            <span className="text-ink-primary font-semibold">{formatTime(currentTimestampMs)}</span>
            <span className="text-ink-dim">/</span>
            <span className="text-ink-tertiary">{formatTime(totalDurationMs)}</span>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-obsidian-canvas text-[10px] text-ink-tertiary border border-obsidian-subtle">
              FRAME {currentFrameIndex}
            </span>
          </div>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-ink-tertiary font-mono text-[11px]">RATE:</span>
          <div className="flex items-center gap-0.5 bg-obsidian-canvas p-0.5 rounded border border-obsidian-subtle font-mono text-[11px]">
            {[0.25, 0.5, 1, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => onChangeSpeed(speed)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-obsidian-elevated text-ink-primary border border-obsidian-border shadow-xs'
                    : 'text-ink-tertiary hover:text-ink-secondary'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
