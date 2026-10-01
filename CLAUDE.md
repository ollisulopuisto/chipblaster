# Notes for working on CHIPBLASTER

## Interface rules

- Button labels never change. A key keeps the same text in every state. Put changing values such as counts, levels or names in the tooltip.
- A key with two states (on and off) shows its state by being pushed in when on. It has no lamp.
- Lamps are for keys with more than two states or a state that is not "on" (CLICK shows its level with two lamps; the play key shows paused with a red lamp). Green means active, red means paused or stopped.
- Feature names follow the 1980s Japanese hi-fi style (see `FN` in `src/App.tsx`); each gets a tooltip and a line in the manual.
