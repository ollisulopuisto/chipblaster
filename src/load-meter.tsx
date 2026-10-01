import React, { useEffect, useState } from 'react';

type Meter = { engineName?: string; load?: number; peak?: number; capacity?: { avg: number; peak: number } | null; fp?: boolean; audioContext?: { sampleRate: number; baseLatency?: number } };

/** Debug readout for ?debug or ?engine=: the SID engine and how much of real time its rendering takes. Above 100 % the sound breaks up. */
export function LoadMeter({ player }: { player: Meter | null }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick(n => n + 1), 500); return () => window.clearInterval(t); }, []);
  if (!player) return <div className="load-meter">ENGINE ... (start a tune)</div>;
  const pct = (v?: number) => ((v ?? 0) * 100).toFixed(1).padStart(5) + ' %';
  const fp = !!player.engineName?.startsWith('libsidplayfp');
  const cap = player.capacity;
  return (
    <div className="load-meter" role="status" aria-live="off">
      <span>{player.engineName ?? 'jsSID'}</span>
      {fp
        ? <span>RENDER {pct(player.load)} (worst {pct(player.peak)})</span>
        : <span>CPU ~{pct(player.load)} (coarse clock)</span>}
      {cap && <span>AUDIO THREAD {pct(cap.avg)} (worst {pct(cap.peak)})</span>}
      <span>{player.audioContext?.sampleRate ?? '?'} Hz</span>
    </div>
  );
}
