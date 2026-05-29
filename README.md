# HK Space Shooting Game

> A professional-grade, canvas-based space shooter built with vanilla HTML5, CSS3, and JavaScript — zero dependencies, zero build tools, fully playable in any modern browser.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Gameplay](#gameplay)
  - [Controls](#controls)
  - [Weapons](#weapons)
  - [Enemy Types](#enemy-types)
  - [Power-Ups](#power-ups)
  - [Wave System](#wave-system)
  - [Difficulty Modes](#difficulty-modes)
  - [Scoring & Combos](#scoring--combos)
- [Technical Architecture](#technical-architecture)
  - [Rendering Pipeline](#rendering-pipeline)
  - [Audio Engine](#audio-engine)
  - [Collision System](#collision-system)
  - [Performance Considerations](#performance-considerations)
- [Browser & Device Support](#browser--device-support)
- [Customisation](#customisation)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Overview

HK Space Shooting Game is a fully self-contained, client-side space shooter. The player controls a spaceship against escalating waves of enemy craft, with boss encounters every five waves. It runs directly from the filesystem — no server, no bundler, no package manager required.

The game targets both desktop and mobile platforms from a single codebase, automatically adapting controls, particle counts, and UI layout to the detected device type.

---

## Features

| Category | Details |
|---|---|
| **Rendering** | Hardware-accelerated HTML5 Canvas with glow effects and screen shake |
| **Audio** | Procedural sound synthesis via the Web Audio API — no audio files |
| **Controls** | Keyboard + mouse on desktop; virtual joystick + fire button on mobile |
| **Weapons** | Three switchable weapon modes: Laser, Spread, Plasma |
| **Enemies** | Seven distinct enemy archetypes with unique AI behaviours |
| **Boss Fights** | Armoured boss every 5th wave with 360° bullet patterns |
| **Power-Ups** | Six collectable power-up types with visual and gameplay effects |
| **Difficulty** | Three selectable difficulty presets (Easy / Normal / Hard) |
| **Persistence** | High score saved to `localStorage` across sessions |
| **HUD** | Live score, wave counter, kill count, health bar, and shield bar |
| **Combo System** | Kill-streak multiplier with on-screen combo announcements |
| **Particle FX** | Dynamic particle bursts with mobile-aware count limits |
| **Haptics** | Vibration API integration for mobile impact feedback |

---

## Project Structure

```
hk-space-shooting/
├── index.html   # Game shell — canvas, HUD, overlays, mobile controls
├── style.css    # Complete UI theme — glassmorphism, animations, responsive layout
└── game.js      # Full game engine — IIFE, self-contained, no external dependencies
```

All game logic, physics, audio, and rendering live inside a single immediately-invoked function expression (IIFE) in `game.js` to avoid global namespace pollution.

---

## Getting Started

### Running locally

No build step is required. Simply open `index.html` in any modern browser:

```bash
# Option 1 — open directly (works in most browsers)
open index.html

# Option 2 — serve with Python (recommended for consistent audio behaviour)
python3 -m http.server 8080
# then navigate to http://localhost:8080

# Option 3 — serve with Node
npx serve .
```

> **Note on audio:** Browsers block `AudioContext` autoplay. The engine calls `AC.resume()` on the first user interaction (tap, click, or keypress), so audio will activate automatically once the player starts the game.

### Deploying

Because there are no build artifacts or server-side dependencies, the three source files can be dropped into any static hosting environment (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, etc.) as-is.

---

## Gameplay

### Controls

#### Desktop

| Action | Input |
|---|---|
| Move | `W A S D` or `↑ ↓ ← →` arrow keys |
| Aim | Mouse cursor |
| Fire | Hold left mouse button |
| Switch weapon | `Q` or pickup a ⚡ power-up |
| Pause / Resume | `ESC` or the ⏸ button |

#### Mobile

| Action | Input |
|---|---|
| Move | Virtual joystick (bottom-left) |
| Fire | `FIRE` button (bottom-right) |
| Switch weapon | `⚡` button |
| Pause | ⏸ button (top-right) |

On mobile, the player ship auto-aims at the nearest visible enemy.

---

### Weapons

| # | Name | Colour | Damage | Fire Rate | Behaviour |
|---|---|---|---|---|---|
| 0 | **LASER** | Cyan `#0ff` | 12 | Fast (0.12 s) | Single high-velocity projectile |
| 1 | **SPREAD** | Yellow `#ff0` | 7 × 5 | Medium (0.18 s) | Five-shot fan pattern |
| 2 | **PLASMA** | Magenta `#f0f` | 35 | Slow (0.35 s) | Large slow-moving ball |

Weapons cycle in order: Laser → Spread → Plasma → Laser. Switch by collecting the ⚡ power-up or pressing `Q`.

---

### Enemy Types

| Type | HP | Speed | Score | Behaviour |
|---|---|---|---|---|
| **Drone** | 15 | Fast | 100 | Descends with a sinusoidal weave |
| **Fighter** | 30 | Medium | 200 | Descends and fires aimed shots at the player |
| **Tank** | 80 | Slow | 350 | Heavy armour, straight descent, no return fire |
| **Bomber** | 25 | Fast | 250 | Homing; detonates on contact for 25 damage |
| **Sniper** | 20 | Slow | 300 | Stops near top of screen, fires high-speed precision shots |
| **Swarm** | 8 | Very fast | 50 ea. | Spawns in clusters of 8–12; erratic movement |
| **Boss** | 500+ | Slow | 2000 | Appears every 5th wave; sweeping sinusoidal path; 8-way radial bullet spread |

Enemy HP and speed scale with wave number using the formula `base × (1 + wave × 0.12)` and are further modified by the selected difficulty multiplier.

---

### Power-Ups

Power-ups drop from defeated enemies with a 18% chance and fall at 40 px/s. Collect by flying through them.

| Icon | ID | Effect |
|---|---|---|
| ❤ | Health | Restores 30 HP (capped at max HP) |
| 🛡 | Shield | Fills shield to maximum (50 units) |
| ⚡ | Weapon | Advances weapon to the next type |
| 💥 | Bomb | Instantly destroys all on-screen enemies |
| 🚀 | Speed | Increases movement speed by 60% for 5 seconds |
| 2X | Double Score | Doubles all score gains for 8 seconds |

---

### Wave System

- Waves begin with a 2-second delay after the previous wave is cleared.
- Standard waves spawn `5 + (wave × 3)` enemies, with spawn intervals decreasing as waves progress.
- **Every 5th wave is a Boss Wave** — a single high-HP boss with a reinforced bullet pattern. Boss HP scales as `500 + (wave × 50)`.
- Enemy type variety unlocks progressively: Fighters from wave 2, Bombers from wave 3, Tanks from wave 4, Snipers from wave 5, Swarms from wave 6.

---

### Difficulty Modes

| Mode | Player HP | Enemy HP | Enemy Speed | Spawn Rate |
|---|---|---|---|---|
| **Easy** | ×1.5 | ×0.7 | ×0.8 | Slower |
| **Normal** | ×1.0 | ×1.0 | ×1.0 | Standard |
| **Hard** | ×0.7 | ×1.4 | ×1.3 | Faster |

Select a difficulty on the start screen before the game begins. The setting cannot be changed mid-run.

---

### Scoring & Combos

- Base score values are defined per enemy type (see [Enemy Types](#enemy-types) above).
- **Combo multiplier:** Killing enemies within 2 seconds of each other builds a streak. The current streak count is applied as a score multiplier.
- Streaks of 3 or more display an on-screen `Nx COMBO!` announcement.
- The **2X power-up** doubles all score gains, stacking with the combo multiplier.
- The all-time high score for the device is saved to `localStorage` under the key `hkSpaceBest` and displayed on the Game Over screen.

---

## Technical Architecture

### Rendering Pipeline

The game runs a single `requestAnimationFrame` loop. Each tick:

1. Delta time (`dt`) is computed and clamped to 50 ms to prevent spiral-of-death on tab blur.
2. Stars are updated and drawn first (always, even while paused).
3. Game objects are updated in order: player → bullets → enemies → power-ups → particles.
4. Collision detection runs after all updates.
5. The draw order is: background fill → stars → power-ups → enemies → bullets → player → particles.
6. All canvas state that uses effects (shadows, `globalAlpha`) is isolated with `X.save()` / `X.restore()`.

Screen shake is implemented by applying a random `translate` transform to the canvas context for the duration of the shake timer.

### Audio Engine

All sound effects are synthesised in real-time using the Web Audio API — no audio files are loaded or bundled. Each sound is a short `OscillatorNode` connected through a `GainNode` with an exponential ramp to silence. Waveform type, pitch envelope, and volume are parameterised per sound:

| Sound | Waveform | Start Frequency | End Frequency |
|---|---|---|---|
| Laser shot | Square | 800 Hz | 400 Hz |
| Spread shot | Sawtooth | 600 Hz | 300 Hz |
| Plasma shot | Sawtooth | 200 Hz | 80 Hz |
| Hit | Square | 200 Hz | 50 Hz |
| Explosion | Sawtooth | 80 Hz | 20 Hz |
| Power-up | Sine | 400 Hz | 800 Hz |
| Boss spawn | Square | 60 Hz | 30 Hz |

Sound and vibration can be toggled independently via the ⚙ settings panel during gameplay.

### Collision System

All collision detection uses circle–circle intersection for performance:

```
distance² = (ax − bx)² + (ay − by)²
collision  = distance² < (ra + rb)²
```

The squared-distance comparison avoids a `Math.sqrt` call on every check. Bullet arrays are iterated in reverse to allow safe in-place splicing.

### Performance Considerations

- Particle count is capped at 300 on desktop and 150 on mobile.
- Burst particle counts are halved on mobile.
- HUD DOM updates are throttled — each element is only written when its backing value changes (dirty-check pattern via `prevHud`).
- The star field density is dynamically calculated from the canvas area (`min(200, floor(W × H / 8000))`), preventing excessive draw calls on large displays.
- The main loop uses a `dt` cap of 50 ms, ensuring smooth recovery after background tab throttling.

---

## Browser & Device Support

| Environment | Status |
|---|---|
| Chrome / Edge (desktop) | ✅ Full support |
| Firefox (desktop) | ✅ Full support |
| Safari (desktop) | ✅ Full support |
| Chrome / Samsung Internet (Android) | ✅ Full support incl. haptics |
| Safari (iOS) | ✅ Full support (haptics unavailable on iOS) |
| Opera / Brave | ✅ Full support |

**Minimum requirements:** ES6 support, HTML5 Canvas, Web Audio API. All are available in any browser released after 2017.

---

## Customisation

All tunable constants are defined near the top of their respective sections in `game.js`:

| Constant / Object | Location | What it controls |
|---|---|---|
| `DIFFICULTY` | `game.js ~line 294` | Per-mode HP, speed, and spawn rate multipliers |
| `ENEMY_DEFS` | `game.js ~line 504` | Base HP, radius, speed, score value, and colour per enemy type |
| `POWERUP_TYPES` | `game.js ~line 235` | Power-up roster, icons, colours, and effect functions |
| `player.fireRate` | `game.js ~line 307` | Per-weapon fire interval in seconds |
| `MAX_PARTICLES` | `game.js ~line 115` | Particle pool size (desktop vs. mobile) |
| CSS Custom Properties | `style.css :root` | Full colour palette, spacing scale, typography scale, and z-index layers |

The visual theme — colours, glow effects, fonts, and layout — is entirely controlled through CSS custom properties in the `:root` block of `style.css`, making reskins straightforward without touching game logic.

---

## Known Limitations

- **No pause-on-tab-blur:** The game continues to run (but is silent and freezes rendering) when the browser tab loses focus. Pressing `ESC` to pause manually is recommended.
- **No touch-aim support:** On mobile, the ship always auto-aims at the nearest enemy. Manual aim via touch drag is not implemented.
- **Single save slot:** `localStorage` stores one high score only. Multiple profiles or run history are not supported.
- **No fullscreen API:** The canvas fills `100vw × 100vh` but does not invoke the Fullscreen API. Use the browser's built-in fullscreen shortcut (`F11` on most desktops) if needed.
- **iOS haptics:** The Vibration API is not supported on iOS Safari; haptic feedback is silently skipped on that platform.

---

## License

This project is released for personal and educational use. No third-party libraries, fonts loaded at runtime via Google Fonts CDN, or audio assets are embedded in the source files.
