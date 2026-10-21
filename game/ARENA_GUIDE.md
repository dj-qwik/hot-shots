# Hot Shots — arena rebuild guide

You own a group of arena files in `src/arenas/`. Rebuild each one to a **premium visual standard** and
**tight, exploit-proof gameplay**, then prove it with the test suite. Edit ONLY your own arena files.

## Audience and goals
- Players are crypto people and gamers: very critical of visual quality and they hunt exploits within
  minutes. Real money (test ETH for now) rides on the result, so outcomes must come from skill.
- Difficulty: young adults. Fast, tight, punishing mistakes — but rules readable in one glance.
- Fun to WATCH: hazards are telegraphed, eliminations are dramatic, the leader is obvious.
- Rounds are mini games, **30 s hard cap** (most should end naturally in 15–28 s).

## What is already done for you (shared engine — do not edit)
- **2.5D camera** (`src/05_view.js`): world is simulated top-down in 960×600 (x right, y down, z up) and
  rendered as a tilted stage (floor foreshortened by `TILT` = 0.74, world y=0 sits at screen y=112 just
  under the stadium). Your `draw(t)` runs inside the **world transform**: floor shapes in world coords
  are foreshortened automatically (circles become ellipses — correct).
  - `lift(z)` → world-y offset that raises something by z screen px (`y - lift(10)` is 10 px higher).
  - `billboard(x, y, z, fn, scale)` → draw `fn()` UPRIGHT in screen px with origin at the projected
    point (+y is down, so draw upward with negative y). Use for anything with height: items, spheres,
    cars, posts, signs, floating text.
  - `sprite(y, fn)` → queue an upright thing; `drawAll(beans, extras)` depth-sorts beans + queued
    sprites + `extras` (`[{y, draw}]`) by world y. Always draw beans and tall objects through
    `drawAll` so things in front overlap things behind.
  - `inScreen(fn)` → plain screen space (for HUD bits drawn in the canvas).
  - Scrolling arenas: set `CAM.scrollY` (e.g. `cam() { return camY }` on the arena — the game sets
    `CAM.scrollY = arena.cam()` before `draw`). **Never `ctx.translate(0, -camY)` yourself.**
    `followCam()` already accounts for the tilt.
  - `b.zoff` = height of the floor a bean stands on (e.g. −86 for a lower level); `drawBean` uses it.
- **Stadium + floor**: the game draws the stadium (crowd, lights, LED board) and `stageFloor(theme)`
  BEFORE your `draw`. Set `theme:` on your arena (`night, neon, sunset, arctic, candy, space, fire,
  meadow` in `src/15_stadium.js`). Do NOT paint full-screen backgrounds (`backdrop`, `floorTexture`,
  `water()` over 0..W×0..H) — build an arena *object* (platform, track, pool, board) on the stage.
- **Materials** (`src/12_materials.js`): `mat(name)` returns a pattern: `noise wood metal rubber ice
  grass asphalt carpet neon tile sand plastic stone water lava candy felt cloud`. `grain(x,y,w,h,a)`
  overlays film grain. Light: `glow(color, blur, fn)`, `additive(fn)`, `lightPool(x,y,r,color,a)`,
  `contactShadow(x,y,rx,ry,a)`, `sphere(r, color)` (inside a billboard), `box(w,d,h,top,front)`
  (inside a billboard, extruded block), `platformCircle/platformRect(... depth)` (raised slabs),
  `hexPath`, `roundRect`, `shade(hex, factor)`, `hexA(hex, alpha)`.
- **FX** (`src/10_fx.js`): `puff, sparks, confetti, ring, popText(x,y,text,color,size), shake(n),
  hype(n)` (crowd excitement), `announce(text,color,sub)` (big centre callout), `feed(text,color)`
  (kill feed). Eliminations (`kill(b,t)` or `b.alive=false`) automatically get poof + "OUT!" + feed;
  score increases on `bank / stars / next / got / done / cap / prog` automatically pop "+1".
- **Beans** are fully rendered by `drawBean` (shadow, shading, expressions, hats, name tags). You only
  position them. Useful flags: `b.scaredT` (scared eyes), `b.happyT`, `b.stun`.
- **HUD in canvas**: `tally(beans, fmt, frac)` (bottom score strip; `frac` = 0..1 progress bar),
  `progressStrip(beans, LEN, goalY)` (race rail). Both already draw in screen space.
- Movement: `stepBean` (run 200ish px/s, jump 430 with 0.12 s buffer, dive = committed lunge with
  get-up + fatigue). `mods(b)` on your arena can return `{ slow, traction }` per surface.
  `maxSpeed`, `diveSpeed`, `tackle` (knockback) are per-arena.
- Spawn order is shuffled every round by the game; still randomise your own hazard phases/angles.

**Reference:** `src/arenas/hex.js` (Hex Hop) is converted: extruded tiles, a lower level drawn under the
upper one, per-level depth sorting, telegraphed drops, theme, screen-space labels.

## Visual standard (every arena)
1. The arena is a **built object with depth**: extruded edges/sides (use `lift`), material texture,
   bevel highlights, rim light, soft contact shadows. Nothing important is a flat single-colour shape.
2. **Every object with height is upright** (billboard/box/sphere) and depth-sorted with the beans.
3. **Hazards telegraph** before they hurt: warning colour (amber → red), flashing, growing rings,
   arrows, sound-free readability. Safe vs deadly must be obvious in a still screenshot.
4. **Emissive things glow** (lasers, pads, goals, orbs) via `glow`/`additive`; add `lightPool`s on the
   floor under bright things.
5. **Juice on events**: `puff/sparks/ring` on impacts, landings, pickups; `shake` sparingly (bigger
   only when the player is involved); `hype` on big moments; `announce` for arena-specific beats
   (e.g. "LAST LAP!", "FLOOR DROPPING!").
6. **Readable at a glance**: goal/objective areas labelled on the floor (`bigLabel` decal or a
   billboard sign), per-bean progress in `tally`/`progressStrip`.
7. Animate idle things (rotating, bobbing, scrolling textures) so the scene is never static.
8. Keep it fast: avoid per-frame `createPattern`, huge `shadowBlur` on many shapes, or >2k path ops.
   Gradients per object per frame are fine at these counts.

## Gameplay standard (every arena)
- **No lazy wins.** The suite plays: idle, hold up/down/left/right, beeline to centre, hold up + spam
  jump, and mash dive. Each must win ≤ 20% of 4-player rounds (fair share is 25%). If one does, change
  the DESIGN (obstacles that block straight lines, moving targets, forced direction changes, hazards
  that punish standing still) — don't just nerf the player.
- **Skill wins.** The arena's bot strategy in the player seat must beat lazy play.
- **Fair.** No seat/bean advantage (chi-square check with identical bots).
- **Always ends ≤ 30 s with a winner**; tie-breaks on timeout must be meaningful (progress, distance to
  centre, score) and visible in the HUD.
- **Bots are decent** (they are the opponents in test mode): avoid hazards, contest objectives, make
  occasional mistakes scaled by `b.skill` (0.72–0.95).
- Think like an exploit hunter: corners you can camp, walls you can hug, timers you can wait out,
  safe spots hazards never reach, ways to win without engaging. Close them.
- Objective text: ≤ 3 short sentences; the intro card splits on full stops into lines.

## Workflow
```bash
cd game
python3 build.py --out dist/<you> --only <your,arena,keys>          # bundle only your arenas
GAME_JS=dist/<you>/game.js node tools/accept.mjs <key>               # full suite for one arena (~0.5–2 min)
GAME_JS=dist/<you>/game.js node tools/accept.mjs <key> --quick       # faster, noisier
GAME_HTML=dist/<you>/hotshots-arena.html node tools/shot.mjs out.png <key> 6000   # screenshot after 6 s
```
- Look at your screenshots (Read the PNG) at several moments (e.g. 2 s, 10 s, 20 s). Iterate until it
  looks premium. Fonts Bungee/Baloo 2 are installed locally so screenshots match the real look.
- The machine has 2 CPUs shared by several workers: run the suite for one arena at a time, prefer
  `--quick` while iterating and one full run at the end.
- `tools/harness.mjs` exposes `runRound` if you need custom probes (e.g. a specific exploit).

## Deliverable (your final message)
For each arena: what you changed in gameplay (exploits found and how you closed them), what you changed
visually, the final full `accept.mjs` line (must be PASS), screenshot paths you checked, and the
ambient you want (`snow, stars, bubbles, confetti, embers, sparkle, rain` or none). Do not publish.
