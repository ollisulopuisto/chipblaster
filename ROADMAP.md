# Roadmap

## Shared listening (not started)

Sync the playlist and playhead with other clients in a room.

**Model.** One host controls; listeners follow. Only small state is synced: queue (HVSC paths), current track and subtune, play/pause, start time. Audio is not streamed; every client fetches the tunes from the Modland mirror and emulates locally. Local files cannot be synced.

**Techniques borrowed from online games**
- Clock sync: NTP-style offset from several pings, using the lowest-RTT sample.
- Timestamped events instead of frame streaming: "at shared time T, track X from position P, play". Clients derive the playhead as `P + (now - T)` (dead reckoning). SID emulation is deterministic, so this holds.
- Client-side prediction: the local user's pause/skip applies immediately and is reconciled with the host's authoritative state.
- Drift correction: small drift is corrected by slightly adjusting playback rate (jsSID exposes `tapeRate`); large drift by fast-forwarding.
- Join in progress: snapshot (queue, track, T, P), then the late joiner fast-forwards the emulation to the current position. SID cannot seek, so no emulator-state snapshots.

**Not needed:** rollback netcode, frame prediction, delta compression.

**Constraints:** browser autoplay needs a user gesture before a listener hears audio.

**Open decision:** transport.
1. WebRTC peer-to-peer (Trystero or PeerJS): no own server, fits GitHub Pages, invite by link like SHARE. Public signaling can be unreliable and NAT can block connections.
2. Small realtime service (Cloudflare Durable Objects, PartyKit or Supabase Realtime): more reliable and scales to more listeners, but needs a maintained service.

Suggested start: option 1, single host, timestamped events, `tapeRate` drift correction.
