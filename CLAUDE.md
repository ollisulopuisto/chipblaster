# Notes for working on CHIPBLASTER

## Interface rules

- Button labels never change. A key keeps the same text in every state. Put changing values such as counts, levels or names in the tooltip.
- A key with two states (on and off) shows its state by being pushed in when on. It has no lamp. The exception is FAVORITE: it springs back after each press and a green lamp shows that the tune is saved.
- A control with three settings is a slide selector with the positions printed on the panel (CLICK: OFF, SOFT, FULL), not a key. The exception is the play key, which has three heights like a shift lock: up is stopped (red lamp), all the way down is playing (green lamp), halfway up is paused (red lamp, slow pulse). Green means active, red means paused or stopped.
- Feature names follow the 1980s Japanese hi-fi style (see `FN` in `src/App.tsx`); each gets a tooltip and a line in the manual.
- Type has fixed roles. Labels printed on the case are hi-fi condensed sans (the prototype finish) or Silkscreen (the C64 finish). Anything that changes while the device runs, such as time, counts and the path, is a segment display. Data the user reads or types (tune names, composers, search text) stays readable: names wrap, they are not cut. Accents fold to plain letters in pixel and segment fonts. The exception is the TAPE COUNTER of the C64 finish: four wheels reading MMSS at the right end of the seek bar, with digits in Silkscreen printed on the wheels, as on a Datassette. It has no reset. The C64 finish therefore has no time in the segment display; the prototype finish keeps it there and has no counter.
- Keys that act on a selection sit in one key bar above the list, in the same four places in the search and playlist windows: play, add or remove, one long key, save. The long key is the space bar. Selection is shown in reverse video.
- Controls that exist on the panel never disappear. When one does not apply (SID 2 on a one-chip tune), it rests in its off position and springs back when pressed; it is not greyed out.
