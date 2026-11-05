import React, { useState } from 'react';
import { GitPullRequestIcon, CopyIcon } from '../icons';

interface PullRequestTabProps {
  pullRequestMd: string;
  beforeAfterUrl?: string;
  branch: string;
}

export const PullRequestTab: React.FC<PullRequestTabProps> = ({
  pullRequestMd,
  beforeAfterUrl,
  branch,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pullRequestMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 text-xs">
      {/* Header toolbar */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-obsidian-surface border border-obsidian-border">
        <div className="flex items-center gap-2 text-ink-primary font-medium">
          <GitPullRequestIcon size={15} className="text-emerald-400" />
          <span className="font-semibold text-ink-primary">Pull Request Synthesis</span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-obsidian-elevated border border-obsidian-border text-ink-secondary">
            {branch}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ✓ 5/5 PASSED
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-brand hover:bg-amber-hover text-obsidian-canvas font-semibold transition-colors shadow-sm"
        >
          <CopyIcon size={12} />
          <span>{copied ? 'Copied Markdown' : 'Copy PR Markdown'}</span>
        </button>
      </div>

      {/* Visual Verification Card Preview */}
      {beforeAfterUrl && (
        <div className="bg-obsidian-surface rounded-lg border border-obsidian-border p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-ink-primary font-medium text-xs">
            <span className="font-semibold">Synthesized Verification Card (1200×630)</span>
            <span className="text-ink-tertiary font-mono text-[11px]">artifacts/before_after.png</span>
          </div>
          <div className="rounded border border-obsidian-border bg-obsidian-canvas overflow-hidden">
            <img
              src={beforeAfterUrl}
              alt="Visual Verification Before / After Card"
              className="w-full h-auto object-contain max-h-72"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Rendered Markdown Preview */}
      <div className="bg-obsidian-surface rounded-lg border border-obsidian-border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-obsidian-border pb-2">
          <span className="font-semibold text-ink-primary">Pull Request Description</span>
          <span className="text-[11px] font-mono text-ink-tertiary">Markdown GFM</span>
        </div>
        <pre className="p-3 bg-obsidian-canvas rounded border border-obsidian-border text-ink-secondary font-mono text-xs whitespace-pre-wrap overflow-x-auto leading-relaxed">
          {pullRequestMd}
        </pre>
      </div>
    </div>
  );
};
