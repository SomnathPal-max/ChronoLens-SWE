import React, { useState } from 'react';
import { GitPullRequestIcon, CopyIcon, ExternalLinkIcon } from '../icons';

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
    <div className="flex flex-col gap-6 text-xs">
      {/* Header toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <GitPullRequestIcon size={16} className="text-purple-400" />
          <span>GitHub Pull Request Description ({branch})</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-sm"
        >
          <CopyIcon size={12} />
          <span>{copied ? 'Copied to Clipboard!' : 'Copy PR Markdown'}</span>
        </button>
      </div>

      {/* Visual Verification Card Preview */}
      {beforeAfterUrl && (
        <div className="bg-[#141b2d] rounded-xl border border-slate-800 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-slate-300 font-semibold text-xs">
            <span>Generated 1200x630 Verification Card</span>
            <span className="text-slate-500 font-mono text-[11px]">before_after.png</span>
          </div>
          <div className="rounded-lg overflow-hidden border border-slate-800 bg-black/60 shadow-lg">
            <img
              src={beforeAfterUrl}
              alt="Visual Verification Before / After Card"
              className="w-full h-auto object-contain max-h-72"
              onError={(e) => {
                // If image url fails (e.g. static server path), gracefully fall back
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Rendered Markdown Preview */}
      <div className="bg-[#141b2d] rounded-xl border border-slate-800 p-5 flex flex-col gap-4 text-slate-200 leading-relaxed font-sans shadow-sm">
        <div className="prose prose-invert max-w-none text-xs">
          <pre className="p-4 bg-[#0a0d14] rounded-lg border border-slate-800 text-slate-300 font-mono text-xs whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {pullRequestMd}
          </pre>
        </div>
      </div>
    </div>
  );
};
