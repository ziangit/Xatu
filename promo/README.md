# promo

`intro.html` — a 60-second animated intro for posting on X.

Open it in a browser and screen-record the square. It is one continuous
timeline rather than a slideshow: every beat grows out of the one before it.

- **R** restarts from zero. **Space** pauses.
- The square is 1080×1080 and scales to fit the window, so make the window as
  tall as your screen allows and record that region.
- It waits for every sprite before the first frame, so nothing pops in late.
  Playback is identical every run — record twice and the frames match.

## The timeline

|        |                                                                       |
| ------ | --------------------------------------------------------------------- |
| 0–5s   | a team report's prose collapses into the turn-0 card                  |
| 5–13s  | six sprites fly into the roster row                                   |
| 13–20s | two step forward; the opponent appears                                |
| 20–30s | turn 1 — the arrow draws, moves snap in                               |
| 30–44s | **the branch** — the beat nothing else does, so it gets the most time |
| 44–52s | it all folds into the published card                                  |
| 52–60s | the link types itself, then the wordmark                              |

## Why it is built this way

**Sprites are hotlinked from Showdown**, exactly as the app does, and the
palette, type colours and card geometry are the app's own — so the video shows
what a viewer actually gets. Nothing is a mockup of a feature that does not
exist.

**There is no Pokémon mascot.** Sprites appear because they identify which
Pokémon is in which slot, which is the same footing every VGC tool stands on.
A character animated across the frame as decoration is a different thing and a
worse idea, legally and creatively.

**It works silent.** X autoplays muted, so each beat carries its own caption
and the motion does the pacing. Music is a reward for unmuting, not the spine
— and it must not be Pokémon game music.

**Square, not 16:9.** A square takes more timeline height on a phone.

## Editing it

One timeline, driven by `animation-delay` from a single `.run` parent. To move
a beat, change its delay in the block at the bottom of the `<style>`.

One trap, learned the hard way: **give an element one animation, not two.**
During the second animation's delay its backwards fill wins, so an element
with `popIn … 44s both, out … 52s both` is visible from frame one. Where a
thing needs both an entrance and an exit, a wrapper carries one of them.
