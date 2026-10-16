# promo

A 30-second intro for X, **rendered** to a video file rather than screen-recorded.

```bash
node promo/render.mjs          # → promo/out/xatu-intro.mp4  (about 3 minutes)
node promo/render.mjs --serve  # preview it in a browser, with sound
```

Needs Chrome and ffmpeg. The output — video, soundtrack and the sprite cache —
lands in `promo/out/`, which is gitignored: CLAUDE.md says never to commit
sprite or audio assets, and an mp4 is both.

## The board in it is the real one

The middle act draws the board at the app's own metrics and grammar: the
Showdown icon sheet the board uses, greyed roster entries for the unpicked,
Front and Back tiles with the violet Mega border and the dashed sky border for
a switch-in, move chips with `⟡`, a grey arrow to the next turn and a dashed
amber one to an alternate. The two calculation lines are the **real output of
`runCalc`** on the author's own sets, with the Megas recorded — not numbers
written for the film. A third, Thunderbolt into Archaludon at 19–23%, is left
out: true, but a weak number in a 30-second ad raises a question it has no
time to answer.

## How it works

`intro.html` is a canvas whose every frame is a pure function of time:
`render(t)` draws frame `t`, and `buildSong()` schedules every note of an
original soundtrack on the same clock. `render.mjs` serves the page, steps `t`
through 900 frames at 30fps, renders the soundtrack offline, and pipes both into
ffmpeg. So every hit lands on its frame, the file is identical on every run,
and there is no music to license.

## The film

120 BPM — a beat is 0.5s, a bar is 2s.

|           |                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cold open | half a second of the finished board — the alternate card lit amber, with its last line — torn away to black. It is also frame 0, which X uses as the preview. |
| 0–4s      | team preview: twelve sprites slam in on eighth notes, each one a note                                                                                         |
| 4–8s      | "what do they lead?" — a slot machine over their six, tightening until it locks                                                                               |
| 8s        | the drop cuts to paper: the four picked in team preview land in the turn-0 card's Front tiles                                                                 |
| 8–13s     | the real board builds itself; the camera pushes onto Thunderbolt while the calculator types its result                                                        |
| 13–16s    | the dashed amber arrow drops to "⑂ alternate turn 1": Archaludon comes in                                                                                     |
| 17–20s    | the alternate lights up — the turn you already planned for                                                                                                    |
| 20–22s    | the board pulls away                                                                                                                                          |
| 22–30s    | xatu                                                                                                                                                          |

Exported as H.264 1080×1080, broadcast-range `yuv420p`, AAC 48kHz, about
−15 LUFS with 2dB of headroom — X normalises loudness and re-encodes, so
peaks near 0dBFS come back clipped and full-range video can come back washed out.

## Three things this cost to learn

- **Showdown sends no CORS headers**, so a canvas that draws its sprites cannot
  be exported. `render.mjs` proxies them from the same origin.
- **A large value cannot come back through the DevTools socket in one
  message.** The 7.7MB soundtrack simply never arrived and the render sat at
  0% CPU. Values are parked on the page and pulled out in slices.
- **Wait for Chrome to exit before deleting its profile** — it writes to the
  directory while it shuts down.
