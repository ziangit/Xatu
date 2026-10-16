# promo

A 30-second intro for X, **rendered** to a video file rather than screen-recorded.

```bash
node promo/render.mjs          # → promo/out/xatu-intro.mp4  (about 3 minutes)
node promo/render.mjs --serve  # preview it in a browser, with sound
```

Needs Chrome and ffmpeg. The output — video, soundtrack and the sprite cache —
lands in `promo/out/`, which is gitignored: CLAUDE.md says never to commit
sprite or audio assets, and an mp4 is both.

## How it works

`intro.html` is a canvas whose every frame is a pure function of time:
`render(t)` draws frame `t`, and `buildSong()` schedules every note of an
original soundtrack on the same clock. `render.mjs` serves the page, steps `t`
through 900 frames at 30fps, renders the soundtrack offline, and pipes both into
ffmpeg. So every hit lands on its frame, the file is identical on every run,
and there is no music to license.

## The film

120 BPM — a beat is 0.5s, a bar is 2s.

|           |                                                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| cold open | half a second of the finished tree, lit, with its last line — torn away to black. It is also frame 0, which X uses as the preview. |
| 0–4s      | team preview: twelve sprites slam in on eighth notes, each one a note                                                              |
| 4–8s      | "what do they lead?" — a slot machine over their six, tightening until it locks                                                    |
| 8s        | the drop: three branches fire out of your lead                                                                                     |
| 8–17s     | the tree grows; the camera flies through it                                                                                        |
| 17–21s    | one path lights up — the line you already planned for                                                                              |
| 21–22s    | the screen opens onto paper from that leaf                                                                                         |
| 22–30s    | xatu                                                                                                                               |

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
