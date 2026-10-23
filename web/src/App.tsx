import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { TimelineScrubber } from './components/TimelineScrubber';
import { RootCauseTab } from './components/Inspector/RootCauseTab';
import { TelemetryTab } from './components/Inspector/TelemetryTab';
import { NetworkTab } from './components/Inspector/NetworkTab';
import { AnomaliesTab } from './components/Inspector/AnomaliesTab';
import { PullRequestTab } from './components/Inspector/PullRequestTab';
import { NewRunModal } from './components/NewRunModal';
import { MOCK_SESSIONS } from './data/mockSessions';
import {
  FileCodeIcon,
  ActivityIcon,
  WifiIcon,
  AlertTriangleIcon,
  GitPullRequestIcon,
} from './components/icons';

type TabType = 'rootcause' | 'telemetry' | 'network' | 'anomalies' | 'pullrequest';

export const App: React.FC = () => {
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [currentSessionId, setCurrentSessionId] = useState<string>('p4-bug1');
  const [currentTimestampMs, setCurrentTimestampMs] = useState<number>(2085); // start right near anomaly
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<TabType>('rootcause');
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);

  const session = sessions[currentSessionId] || sessions['p4-bug1'];

  // Check backend health
  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then((res) => {
        if (res.ok) setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  // Frame interval
  const totalDurationMs = session.duration_s * 1000;
  const frameIntervalMs = 1000 / (session.fps || 30);

  // Playback timer loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) * playbackSpeed;
        lastTime = now;

        setCurrentTimestampMs((prev) => {
          const next = prev + delta;
          if (next >= totalDurationMs) {
            setIsPlaying(false);
            return totalDurationMs;
          }
          return next;
        });

        animId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, totalDurationMs]);

  // Find nearest frame in session
  const frameIndex = Math.min(
    session.frame_count - 1,
    Math.max(0, Math.floor(currentTimestampMs / frameIntervalMs))
  );
  const currentFrame = session.frames[frameIndex];

  // Active anomalies at current timestamp
  const activeAnomalies = session.anomalies.filter(
    (a) => currentTimestampMs >= a.t_start_ms && currentTimestampMs <= a.t_end_ms
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTimestampMs((t) => Math.max(0, t - frameIntervalMs));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTimestampMs((t) => Math.min(totalDurationMs, t + frameIntervalMs));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [frameIntervalMs, totalDurationMs]);

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setIsPlaying(false);
    // Seek to first anomaly of that bug
    const newSession = sessions[id];
    if (newSession && newSession.anomalies.length > 0) {
      setCurrentTimestampMs(newSession.anomalies[0].t_start_ms);
    } else {
      setCurrentTimestampMs(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        currentSession={session}
        sessions={sessions}
        onSelectSession={handleSelectSession}
        onOpenNewRun={() => setIsNewRunModalOpen(true)}
        backendOnline={backendOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-5 flex flex-col gap-5">
        {/* Top 2-Column Split: Video Viewport + Inspector Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Synchronized Video Player (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <VideoPlayer
              session={session}
              currentTimestampMs={currentTimestampMs}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onSeekMs={(ms) => setCurrentTimestampMs(ms)}
              playbackSpeed={playbackSpeed}
              onChangeSpeed={(s) => setPlaybackSpeed(s)}
              currentFrame={currentFrame}
              activeAnomalies={activeAnomalies}
            />

            {/* Scrubber sits right below video for instant navigation */}
            <TimelineScrubber
              session={session}
              currentTimestampMs={currentTimestampMs}
              onSeekMs={(ms) => setCurrentTimestampMs(ms)}
              anomalies={session.anomalies}
              harEntries={session.har_entries}
            />
          </div>

          {/* Right Column: Multi-Tab Telemetry & Root Cause Inspector (5 Cols) */}
          <div className="lg:col-span-5 bg-[#111622] rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col overflow-hidden min-h-[580px]">
            {/* Inspector Tab Bar */}
            <div className="px-3 pt-3 bg-[#141b2d] border-b border-slate-800 flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('rootcause')}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'rootcause'
                    ? 'border-indigo-500 text-indigo-400 bg-[#111622]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCodeIcon size={14} />
                <span>Root Cause &amp; Patch</span>
              </button>

              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'telemetry'
                    ? 'border-sky-500 text-sky-400 bg-[#111622]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ActivityIcon size={14} />
                <span>DOM Probe</span>
              </button>

              <button
                onClick={() => setActiveTab('network')}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'network'
                    ? 'border-emerald-500 text-emerald-400 bg-[#111622]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <WifiIcon size={14} />
                <span>HAR Network</span>
              </button>

              <button
                onClick={() => setActiveTab('anomalies')}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'anomalies'
                    ? 'border-rose-500 text-rose-400 bg-[#111622]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangleIcon size={14} />
                <span>Anomalies ({session.anomalies.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('pullrequest')}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'pullrequest'
                    ? 'border-purple-500 text-purple-400 bg-[#111622]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitPullRequestIcon size={14} />
                <span>PR Preview</span>
              </button>
            </div>

            {/* Inspector Tab Content */}
            <div className="p-5 flex-1 overflow-y-auto max-h-[700px]">
              {activeTab === 'rootcause' && (
                <RootCauseTab
                  rootCause={session.root_cause}
                  patch={session.patch}
                  verification={session.verification}
                  beforeAfterUrl={session.before_after_url}
                />
              )}

              {activeTab === 'telemetry' && (
                <TelemetryTab
                  elements={currentFrame?.probe_elements || []}
                  currentTimestampMs={currentTimestampMs}
                />
              )}

              {activeTab === 'network' && (
                <NetworkTab
                  entries={session.har_entries}
                  currentTimestampMs={currentTimestampMs}
                />
              )}

              {activeTab === 'anomalies' && (
                <AnomaliesTab
                  anomalies={session.anomalies}
                  currentTimestampMs={currentTimestampMs}
                  onSeekMs={(ms) => setCurrentTimestampMs(ms)}
                />
              )}

              {activeTab === 'pullrequest' && (
                <PullRequestTab
                  pullRequestMd={session.pull_request_md}
                  beforeAfterUrl={session.before_after_url}
                  branch={session.patch.branch}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-3.5 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2 max-w-[1700px] w-full mx-auto">
        <div className="flex items-center gap-2">
          <span>ChronoLens-SWE · Meta SAM 3.1 &amp; Muse Wonder Debugger</span>
          <span>•</span>
          <span className="text-slate-400">Rule 8 Guarded · 5/5 Multi-Run Verification</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span>Keyboard: [Space] Play/Pause</span>
          <span>•</span>
          <span>[← / →] Frame Step</span>
        </div>
      </footer>

      {/* New Run Modal */}
      <NewRunModal
        isOpen={isNewRunModalOpen}
        onClose={() => setIsNewRunModalOpen(false)}
        onCompleteRun={(newId) => handleSelectSession(newId)}
      />
    </div>
  );
};
