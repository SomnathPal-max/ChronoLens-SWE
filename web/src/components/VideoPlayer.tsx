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
    <div className="bg-[#111622] rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col">
      {/* Top Video Toolbar: Stream status & Overlay Toggles */}
      <div className="px-4 py-2.5 bg-[#141b2d] border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-semibold text-slate-200">
            {session.bug_title} · H.264 MP4 Stream
          </span>
          <span className="text-slate-500 text-[11px] font-mono">
            ({session.fps} fps · {session.duration_s}s)
          </span>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSamMasks(!showSamMasks)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showSamMasks
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
            }`}
            title="Toggle Meta SAM 3.1 Segmentation Masks"
          >
            <LayersIcon size={12} />
            <span>SAM 3.1</span>
          </button>

          <button
            onClick={() => setShowDomBoxes(!showDomBoxes)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showDomBoxes
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
            }`}
            title="Toggle DOM Probe Bounding Boxes"
          >
            <EyeIcon size={12} />
            <span>DOM Probe</span>
          </button>

          <button
            onClick={() => setShowAnomalies(!showAnomalies)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showAnomalies
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
            }`}
            title="Toggle Anomaly Halos"
          >
            <AlertTriangleIcon size={12} />
            <span>Anomalies</span>
          </button>
        </div>
      </div>

      {/* Video Viewport with Canvas Overlay */}
      <div
        ref={containerRef}
        className="relative aspect-video bg-black/95 flex items-center justify-center overflow-hidden"
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
          /* High-Fidelity Synthetic Simulation Viewport when video is offscreen or loading */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-[#0d131f] to-slate-950 p-6 text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-3 text-indigo-400">
              <LayersIcon size={32} />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              {session.bug_title} (Synchronized Canvas)
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-3">
              Stepping frame-by-frame with SAM 3.1 pixel masks and DOM probe telemetry.
            </p>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
              <span>Timestamp: {currentTimestampMs}ms</span>
              <span>•</span>
              <span>Frame: {currentFrameIndex}</span>
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
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-3 py-1.5 bg-red-600/90 text-white rounded-lg backdrop-blur-md shadow-lg shadow-red-600/30 text-xs font-semibold animate-pulse border border-red-400/50">
            <AlertTriangleIcon size={14} />
            <span>ANOMALY DETECTED: {activeAnomalies[0].type.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="px-4 py-3 bg-[#111726] border-t border-slate-800 flex items-center justify-between gap-4">
        {/* Playback Buttons */}
        <div className="flex items-center gap-2">
          {/* Step Back -1 Frame */}
          <button
            onClick={() => onSeekMs(Math.max(0, currentTimestampMs - frameIntervalMs))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Step back 1 frame (-33ms)"
          >
            <StepBackIcon size={16} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-600/25 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>

          {/* Step Forward +1 Frame */}
          <button
            onClick={() => onSeekMs(Math.min(totalDurationMs, currentTimestampMs + frameIntervalMs))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Step forward 1 frame (+33ms)"
          >
            <StepForwardIcon size={16} />
          </button>

          {/* Time & Frame Counter */}
          <div className="ml-3 font-mono text-xs flex items-center gap-1.5">
            <span className="text-slate-100 font-semibold">{formatTime(currentTimestampMs)}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-500">{formatTime(totalDurationMs)}</span>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700/50">
              Frame {currentFrameIndex}
            </span>
          </div>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Speed:</span>
          <div className="flex items-center gap-1 bg-[#161e31] p-0.5 rounded-lg border border-slate-800">
            {[0.25, 0.5, 1, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => onChangeSpeed(speed)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
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
