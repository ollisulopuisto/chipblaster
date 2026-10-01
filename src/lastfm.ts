// Last.fm scrobbling. The browser talks to Last.fm directly (its API allows cross-origin calls); a small Cloudflare Worker
// (worker/lastfm-signer) signs each write call so the shared secret never reaches the page.
export type ScrobbleTrack = { artist: string; track: string; album?: string; duration: number | null };
export type Session = { name: string; key: string };
type QueueItem = ScrobbleTrack & { timestamp: number };

const API = 'https://ws.audioscrobbler.com/2.0/';
const SESSION_KEY = 'chipblaster-lastfm';
const QUEUE_KEY = 'chipblaster-lastfm-queue';
const MAX_QUEUE = 200;

const env = (import.meta as any).env || {};
export const LASTFM_API_KEY: string = env.VITE_LASTFM_API_KEY || '';
export const LASTFM_SIGNER: string = (env.VITE_LASTFM_SIGNER || '').replace(/\/+$/, '');
/** The feature only appears when a build has been given a key and a signer. */
export const lastfmConfigured = !!(LASTFM_API_KEY && LASTFM_SIGNER);

/** HVSC authors often carry a scene handle: "Marcin Majdzik (Psycho)" becomes "Marcin Majdzik". */
export function cleanArtist(author: string): string {
  return author.replace(/\0/g, '').replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();
}

const read = <T,>(key: string, fallback: T): T => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch {} };

export class LastfmError extends Error { constructor(public code: number, message: string) { super(message); } }

export class LastfmClient {
  session: Session | null = read<Session | null>(SESSION_KEY, null);
  queue: QueueItem[] = read<QueueItem[]>(QUEUE_KEY, []);
  /** Called when the connection state or the queue changes, so the UI can follow. */
  onChange: () => void = () => {};
  /** Called after a successful scrobble. */
  onScrobbled: () => void = () => {};
  private flushing = false;
  private retryTimer: number | null = null;

  /** Calls a Last.fm write method: the signer adds the API key and signature, then the browser calls Last.fm itself. */
  private async call(method: string, params: Record<string, string>): Promise<any> {
    const signed = await fetch(LASTFM_SIGNER + '/sign', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, params }) });
    if (!signed.ok) throw new LastfmError(-1, 'signer ' + signed.status);
    const { api_key, api_sig } = await signed.json();
    const body = new URLSearchParams({ ...params, method, api_key, api_sig, format: 'json' });
    const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    const data = await res.json().catch(() => ({}));
    if (data && data.error) throw new LastfmError(data.error, data.message || 'Last.fm error ' + data.error);
    if (!res.ok) throw new LastfmError(-2, 'Last.fm ' + res.status);
    return data;
  }

  /** Sends the user to Last.fm to approve access; Last.fm returns here with ?token=... */
  connect() {
    const back = location.origin + location.pathname;
    location.href = 'https://www.last.fm/api/auth/?api_key=' + encodeURIComponent(LASTFM_API_KEY) + '&cb=' + encodeURIComponent(back);
  }

  /** Call once on load: if the page was opened by the Last.fm redirect, trade the token for a session. */
  async finishConnect(): Promise<boolean> {
    const url = new URL(location.href);
    const token = url.searchParams.get('token');
    if (!token) return false;
    url.searchParams.delete('token');
    history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
    try {
      const data = await this.call('auth.getSession', { token });
      this.session = { name: data.session.name, key: data.session.key };
      write(SESSION_KEY, this.session);
      this.onChange();
      void this.flush();
      return true;
    } catch { return false; }
  }

  disconnect() {
    this.session = null; this.queue = [];
    write(SESSION_KEY, null); write(QUEUE_KEY, null);
    this.onChange();
  }

  async nowPlaying(t: ScrobbleTrack) {
    if (!this.session) return;
    try { await this.call('track.updateNowPlaying', this.trackParams(t)); } catch (e) { this.failed(e); }
  }

  async scrobble(t: ScrobbleTrack, timestamp: number) {
    if (!this.session) return;
    this.queue.push({ ...t, timestamp });
    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    write(QUEUE_KEY, this.queue);
    this.onChange();
    await this.flush();
  }

  /** Sends queued scrobbles in order; stops at the first failure and tries again later. */
  async flush() {
    if (this.flushing || !this.session) return;
    this.flushing = true;
    try {
      while (this.queue.length && this.session) {
        const item = this.queue[0];
        try {
          await this.call('track.scrobble', { ...this.trackParams(item), timestamp: String(item.timestamp) });
          this.queue.shift(); write(QUEUE_KEY, this.queue); this.onChange(); this.onScrobbled();
        } catch (e) {
          if (e instanceof LastfmError && (e.code === 9 || e.code === 4)) { this.disconnect(); return; }
          // Bad tracks (code 6, 13, 26 and the like) will not get better: drop them. Everything else is retried.
          if (e instanceof LastfmError && e.code > 0 && ![8, 11, 16, 29].includes(e.code)) { this.queue.shift(); write(QUEUE_KEY, this.queue); this.onChange(); continue; }
          this.scheduleRetry(); return;
        }
      }
    } finally { this.flushing = false; }
  }

  private trackParams(t: ScrobbleTrack): Record<string, string> {
    const p: Record<string, string> = { artist: t.artist, track: t.track, sk: this.session!.key };
    if (t.album) p.album = t.album;
    if (t.duration && t.duration > 0) p.duration = String(Math.round(t.duration));
    return p;
  }

  private failed(e: unknown) {
    if (e instanceof LastfmError && (e.code === 9 || e.code === 4)) this.disconnect();
  }

  private scheduleRetry() {
    if (this.retryTimer !== null) return;
    this.retryTimer = window.setTimeout(() => { this.retryTimer = null; void this.flush(); }, 60000);
  }
}

/**
 * Decides when a play counts. Last.fm's rule: the track is longer than 30 seconds and has been played for half its length or four
 * minutes, whichever comes first. "Now playing" goes out the moment playback starts. Pausing stops the clock; changing track or
 * stopping starts over, so a tune played again later scrobbles again.
 */
export class Scrobbler {
  private cur: ScrobbleTrack | null = null;
  private key = '';
  private playing = false;
  private played = 0;
  private lastTick = 0;
  private startedAt = 0;
  private announced = false;
  private done = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private send: { nowPlaying(t: ScrobbleTrack): void; scrobble(t: ScrobbleTrack, timestamp: number): void },
    private clock: () => number = Date.now,
    private tickMs = 1000
  ) {}

  /** The loaded tune, or null when there is nothing to scrobble. */
  setTrack(t: ScrobbleTrack | null) {
    const key = t ? t.artist + '\u0000' + t.track : '';
    this.cur = t;
    if (key === this.key) return;
    this.advance();
    this.key = key;
    this.restart();
    if (this.playing && this.cur) this.begin();
  }

  setPlaying(p: boolean) {
    if (p === this.playing) return;
    this.advance();
    this.playing = p;
    this.lastTick = this.clock();
    if (p) { if (this.cur && !this.announced) this.begin(); this.startTimer(); } else this.stopTimer();
  }

  /** Playback stopped (not just paused): the next play is a new play. */
  reset() { this.advance(); this.restart(); }

  /** Seconds played so far, for tests and for the UI. */
  get playedSeconds() { return this.played; }

  private restart() { this.played = 0; this.announced = false; this.done = false; this.lastTick = this.clock(); }

  private begin() {
    if (!this.cur || this.announced) return;
    this.announced = true;
    this.startedAt = Math.floor(this.clock() / 1000);
    this.send.nowPlaying(this.cur);
  }

  private need(): number | null {
    const d = this.cur?.duration ?? null;
    if (d === null) return 240;
    if (d <= 30) return null;
    return Math.min(d / 2, 240);
  }

  advance() {
    const now = this.clock();
    if (this.playing) this.played += (now - this.lastTick) / 1000;
    this.lastTick = now;
    if (!this.done && this.announced && this.cur) {
      const need = this.need();
      if (need !== null && this.played >= need) { this.done = true; this.send.scrobble(this.cur, this.startedAt); }
    }
  }

  private startTimer() { if (this.timer === null) this.timer = setInterval(() => this.advance(), this.tickMs); }
  private stopTimer() { if (this.timer !== null) { clearInterval(this.timer); this.timer = null; } }
  dispose() { this.stopTimer(); }
}
