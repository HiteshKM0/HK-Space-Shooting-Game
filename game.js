/**
 * HK Space Shooting Game — Complete Game Engine
 * Professional-grade canvas-based space shooter.
 * Supports desktop (keyboard+mouse) and mobile (virtual joystick+buttons).
 */
(() => {
    'use strict';

    /* ================================================================
       CANVAS & RESIZE
       ================================================================ */
    const C = document.getElementById('gc');
    const X = C.getContext('2d');
    let W, H;

    function resize() {
        W = C.width = innerWidth;
        H = C.height = innerHeight;
        // generateStars is called after it's defined below
        if (typeof generateStars === 'function') generateStars();
    }

    /* ================================================================
       AUDIO — Web Audio API synth (zero external files)
       ================================================================ */
    let AC;
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    let soundEnabled = true;

    function playS(f, d, t, v, s) {
        if (!soundEnabled || !AC) return;
        try {
            const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime;
            o.type = t || 'sine';
            o.frequency.setValueAtTime(f, n);
            if (s) o.frequency.exponentialRampToValueAtTime(Math.max(s, 20), n + d);
            g.gain.setValueAtTime(v || 0.12, n);
            g.gain.exponentialRampToValueAtTime(0.001, n + d);
            o.connect(g); g.connect(AC.destination);
            o.start(n); o.stop(n + d);
        } catch (e) { /* ignore audio errors */ }
    }
    function sndShoot()   { playS(800, 0.08, 'square',   0.06, 400); }
    function sndSpread()  { playS(600, 0.10, 'sawtooth', 0.05, 300); }
    function sndPlasma()  { playS(200, 0.20, 'sawtooth', 0.08, 80);  }
    function sndHit()     { playS(200, 0.15, 'square',   0.10, 50);  }
    function sndExplode() { playS(80,  0.40, 'sawtooth', 0.15, 20);  }
    function sndPowerup() { playS(400, 0.30, 'sine',     0.10, 800); }
    function sndBoss()    { playS(60,  0.60, 'square',   0.12, 30);  }

    /* ================================================================
       VIBRATION
       ================================================================ */
    let vibrationEnabled = true;
    function vibrate(ms) {
        if (vibrationEnabled && navigator.vibrate) {
            try { navigator.vibrate(ms); } catch (e) {}
        }
    }

    /* ================================================================
       MOBILE DETECTION
       ================================================================ */
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isMobile) {
        const mc = document.getElementById('mobileControls');
        if (mc) mc.style.display = 'block';
    }

    /* ================================================================
       STAR FIELD — direct drawing (simple & reliable)
       ================================================================ */
    let stars = [];

    function generateStars() {
        stars = [];
        const count = Math.min(200, Math.floor(W * H / 8000));
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: Math.random() * 2.5 + 0.5,
                speed: Math.random() * 1.5 + 0.3,
                alpha: Math.random() * 0.5 + 0.3
            });
        }
    }

    // Now safe to call resize — generateStars is defined
    resize();
    window.addEventListener('resize', resize);

    function updateStars(dt) {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.y += s.speed * 60 * dt;
            if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        }
    }

    function drawStars() {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            X.globalAlpha = s.alpha;
            X.fillStyle = '#fff';
            X.fillRect(s.x, s.y, s.size, s.size);
        }
        X.globalAlpha = 1;
    }

    /* ================================================================
       PARTICLES
       ================================================================ */
    let particles = [];
    const MAX_PARTICLES = isMobile ? 150 : 300;

    function spawnParticle(x, y, color, speed, life, size) {
        if (particles.length >= MAX_PARTICLES) return;
        const angle = Math.random() * Math.PI * 2;
        const spd = (Math.random() * speed + 1) * 60;
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: color,
            life: life * (0.5 + Math.random() * 0.5),
            maxLife: life,
            size: size || (Math.random() * 3 + 1),
            alive: true
        });
    }

    function burst(x, y, color, n, speed, life) {
        n = n || 15; speed = speed || 4; life = life || 0.6;
        const count = isMobile ? Math.floor(n * 0.5) : n;
        for (let i = 0; i < count; i++) {
            spawnParticle(x, y, color, speed, life);
        }
    }

    function bigBurst(x, y) {
        const colors = ['#0ff', '#f0f', '#ff0', '#f44', '#4f4'];
        const count = isMobile ? 20 : 40;
        for (let i = 0; i < count; i++) {
            spawnParticle(x, y, colors[i % 5], 6, 0.8, Math.random() * 4 + 2);
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.size *= 0.98;
            if (p.life <= 0) { particles.splice(i, 1); }
        }
    }

    function drawParticles() {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const a = Math.max(0, p.life / p.maxLife);
            X.globalAlpha = a;
            X.fillStyle = p.color;
            X.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        X.globalAlpha = 1;
    }

    /* ================================================================
       SCREEN EFFECTS
       ================================================================ */
    let shakeAmt = 0, shakeT = 0;
    function shake(a, t) { shakeAmt = a; shakeT = t; }

    function screenFlash() {
        const el = document.getElementById('screenFlash');
        if (!el) return;
        el.classList.remove('active');
        void el.offsetWidth; // force reflow to restart animation
        el.classList.add('active');
        setTimeout(() => el.classList.remove('active'), 400);
    }

    /* ================================================================
       BULLETS
       ================================================================ */
    let playerBullets = [];
    let enemyBullets = [];

    function createBullet(arr, x, y, vx, vy, r, dmg, color) {
        arr.push({ x: x, y: y, vx: vx, vy: vy, r: r, dmg: dmg, color: color, alive: true });
    }

    function updateBullets(arr, dt) {
        for (let i = arr.length - 1; i >= 0; i--) {
            const b = arr[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
                arr.splice(i, 1);
            }
        }
    }

    function drawBullets(arr) {
        for (let i = 0; i < arr.length; i++) {
            const b = arr[i];
            X.save();
            X.shadowColor = b.color;
            X.shadowBlur = 8;
            X.fillStyle = b.color;
            X.beginPath();
            X.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            X.fill();
            X.restore();
        }
    }

    /* ================================================================
       COLLISION
       ================================================================ */
    function collides(ax, ay, ar, bx, by, br) {
        const dx = ax - bx, dy = ay - by;
        return (dx * dx + dy * dy) < (ar + br) * (ar + br);
    }

    /* ================================================================
       POWER-UPS
       ================================================================ */
    let powerups = [];
    let clearScreen = false;

    const POWERUP_TYPES = [
        { id: 'health',  icon: '❤',  color: '#f44', effect: function(p) { p.hp = Math.min(p.hp + 30, p.maxHp); } },
        { id: 'shield',  icon: '🛡', color: '#0af', effect: function(p) { p.shield = p.maxShield; } },
        { id: 'weapon',  icon: '⚡', color: '#ff0', effect: function(p) { p.weapon = (p.weapon + 1) % 3; } },
        { id: 'bomb',    icon: '💥', color: '#f80', effect: function()  { clearScreen = true; } },
        { id: 'speed',   icon: '🚀', color: '#4f4', effect: function(p) { p.speedBoost = 5; } },
        { id: 'double',  icon: '2X', color: '#f0f', effect: function(p) { p.doubleScore = 8; } }
    ];

    function spawnPowerup(x, y) {
        const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerups.push({ x: x, y: y, type: type, r: 14, t: 0, alive: true });
    }

    function updatePowerups(dt) {
        for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];
            p.y += 40 * dt;
            p.t += dt;
            if (p.y > H + 30) { powerups.splice(i, 1); continue; }
            // Check collection
            if (player.alive && collides(p.x, p.y, p.r, player.x, player.y, player.r)) {
                p.type.effect(player);
                sndPowerup();
                burst(p.x, p.y, p.type.color, 12, 3, 0.4);
                powerups.splice(i, 1);
            }
        }
    }

    function drawPowerups() {
        for (let i = 0; i < powerups.length; i++) {
            const p = powerups[i];
            const bob = Math.sin(p.t * 4) * 4;
            X.save();
            X.shadowColor = p.type.color;
            X.shadowBlur = 12;
            X.fillStyle = p.type.color + '44';
            X.beginPath();
            X.arc(p.x, p.y + bob, p.r, 0, Math.PI * 2);
            X.fill();
            X.strokeStyle = p.type.color;
            X.lineWidth = 2;
            X.beginPath();
            X.arc(p.x, p.y + bob, p.r, 0, Math.PI * 2);
            X.stroke();
            X.shadowBlur = 0;
            X.fillStyle = '#fff';
            X.font = '14px sans-serif';
            X.textAlign = 'center';
            X.textBaseline = 'middle';
            X.fillText(p.type.icon, p.x, p.y + bob);
            X.restore();
        }
    }

    /* ================================================================
       DIFFICULTY
       ================================================================ */
    const DIFFICULTY = {
        easy:   { hpMult: 1.5, enemySpeedMult: 0.8, enemyHpMult: 0.7, spawnRateMult: 1.3 },
        normal: { hpMult: 1.0, enemySpeedMult: 1.0, enemyHpMult: 1.0, spawnRateMult: 1.0 },
        hard:   { hpMult: 0.7, enemySpeedMult: 1.3, enemyHpMult: 1.4, spawnRateMult: 0.7 }
    };
    let currentDifficulty = 'easy'; // matches HTML default active button

    /* ================================================================
       PLAYER
       ================================================================ */
    const player = {
        x: 0, y: 0, vx: 0, vy: 0, r: 16,
        hp: 100, maxHp: 100, shield: 0, maxShield: 50,
        weapon: 0, fireRate: [0.12, 0.18, 0.35], fireTimer: 0,
        angle: -Math.PI / 2, alive: true, invulnT: 0,
        weapons: ['LASER', 'SPREAD', 'PLASMA'],
        speedBoost: 0, doubleScore: 0, kills: 0,
        trail: [],

        init: function() {
            this.x = W / 2;
            this.y = H - 120;
            this.vx = 0; this.vy = 0;
            this.angle = -Math.PI / 2; // aim up
            this.hp = 100; this.maxHp = 100;
            this.shield = 0; this.maxShield = 50;
            this.weapon = 0; this.fireTimer = 0;
            this.alive = true; this.invulnT = 0;
            this.speedBoost = 0; this.doubleScore = 0;
            this.kills = 0; this.trail = [];
        },

        update: function(dt) {
            // Movement
            const baseSpeed = 360;
            const spd = baseSpeed * (this.speedBoost > 0 ? 1.6 : 1);
            let moveX = 0, moveY = 0;

            if (isMobile && joystickActive) {
                moveX = joystickDelta.x * spd;
                moveY = joystickDelta.y * spd;
            } else {
                if (keys['w'] || keys['arrowup'])    moveY = -spd;
                if (keys['s'] || keys['arrowdown'])  moveY = spd;
                if (keys['a'] || keys['arrowleft'])  moveX = -spd;
                if (keys['d'] || keys['arrowright']) moveX = spd;
            }

            this.vx += moveX * dt * 8;
            this.vy += moveY * dt * 8;
            this.vx *= 0.88;
            this.vy *= 0.88;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.x = Math.max(this.r, Math.min(W - this.r, this.x));
            this.y = Math.max(this.r, Math.min(H - this.r, this.y));

            // Aim angle
            if (isMobile) {
                let nearest = null, nearestDist = Infinity;
                for (let i = 0; i < enemies.length; i++) {
                    const e = enemies[i];
                    if (!e.alive) continue;
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < nearestDist) { nearestDist = d; nearest = e; }
                }
                this.angle = nearest ? Math.atan2(nearest.y - this.y, nearest.x - this.x) : -Math.PI / 2;
            } else {
                this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
            }

            // Fire
            this.fireTimer -= dt;
            if ((mouse.down || mobileFireDown) && this.fireTimer <= 0) this.shoot();

            // Shield regen
            if (this.shield < this.maxShield) {
                this.shield = Math.min(this.maxShield, this.shield + 2 * dt);
            }

            // Speed boost timer
            if (this.speedBoost > 0) {
                this.speedBoost -= dt;
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > 8) this.trail.shift();
            } else {
                if (this.trail.length > 0) this.trail = [];
            }

            // Double score timer
            if (this.doubleScore > 0) this.doubleScore -= dt;

            // Invulnerability timer
            if (this.invulnT > 0) this.invulnT -= dt;
        },

        shoot: function() {
            const cosA = Math.cos(this.angle);
            const sinA = Math.sin(this.angle);
            const speed = 720;
            const ox = this.x + cosA * 20;
            const oy = this.y + sinA * 20;

            if (this.weapon === 0) {
                createBullet(playerBullets, ox, oy, cosA * speed, sinA * speed, 3, 12, '#0ff');
                sndShoot();
            } else if (this.weapon === 1) {
                for (let i = -2; i <= 2; i++) {
                    const a = this.angle + i * 0.12;
                    createBullet(playerBullets, ox, oy, Math.cos(a) * speed, Math.sin(a) * speed, 2.5, 7, '#ff0');
                }
                sndSpread();
            } else {
                createBullet(playerBullets, ox, oy, cosA * speed * 0.7, sinA * speed * 0.7, 7, 35, '#f0f');
                sndPlasma();
            }
            this.fireTimer = this.fireRate[this.weapon];
        },

        takeDmg: function(d) {
            if (this.invulnT > 0) return;
            // Shield absorbs first
            if (this.shield > 0) {
                const absorbed = Math.min(this.shield, d);
                this.shield -= absorbed;
                d -= absorbed;
            }
            this.hp -= d;
            sndHit();
            shake(4, 0.15);
            vibrate(50);
            burst(this.x, this.y, '#f44', 8, 3, 0.3);
            if (this.hp <= 0) {
                this.hp = 0;
                this.alive = false;
                bigBurst(this.x, this.y);
                sndExplode();
                vibrate(200);
            } else {
                this.invulnT = 0.5;
            }
        },

        draw: function() {
            // Speed boost trail
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                X.globalAlpha = 0.15 * (i / this.trail.length);
                X.fillStyle = '#4ff';
                X.beginPath();
                X.moveTo(t.x, t.y - 14);
                X.lineTo(t.x - 10, t.y + 12);
                X.lineTo(t.x + 10, t.y + 12);
                X.closePath();
                X.fill();
            }
            X.globalAlpha = 1;

            // Invulnerability blink
            if (this.invulnT > 0 && Math.floor(this.invulnT * 12) % 2) return;

            X.save();
            X.translate(this.x, this.y);
            X.rotate(this.angle + Math.PI / 2);

            // Engine flame
            X.fillStyle = '#f80';
            X.globalAlpha = 0.6 + Math.random() * 0.4;
            X.beginPath();
            X.moveTo(-5, 14);
            X.lineTo(0, 14 + 8 + Math.random() * 10);
            X.lineTo(5, 14);
            X.closePath();
            X.fill();
            X.globalAlpha = 1;

            // Ship body
            const grad = X.createLinearGradient(0, -18, 0, 16);
            grad.addColorStop(0, '#0ff');
            grad.addColorStop(1, '#046');
            X.fillStyle = grad;
            X.shadowColor = '#0ff';
            X.shadowBlur = 10;
            X.beginPath();
            X.moveTo(0, -18);
            X.lineTo(-13, 14);
            X.lineTo(0, 8);
            X.lineTo(13, 14);
            X.closePath();
            X.fill();
            X.shadowBlur = 0;

            X.restore();

            // Shield circle
            if (this.shield > 5) {
                X.strokeStyle = 'rgba(0,170,255,' + (0.15 + (this.shield / this.maxShield) * 0.35) + ')';
                X.lineWidth = 2;
                X.beginPath();
                X.arc(this.x, this.y, this.r + 6, 0, Math.PI * 2);
                X.stroke();
            }
        }
    };

    /* ================================================================
       ENEMIES
       ================================================================ */
    let enemies = [];

    const ENEMY_DEFS = {
        drone:   { hp: 15,  r: 10, speed: 2.5, score: 100,  color: '#4f4' },
        fighter: { hp: 30,  r: 14, speed: 2.0, score: 200,  color: '#f80' },
        tank:    { hp: 80,  r: 22, speed: 1.0, score: 350,  color: '#f44' },
        bomber:  { hp: 25,  r: 12, speed: 3.0, score: 250,  color: '#f0f' },
        sniper:  { hp: 20,  r: 10, speed: 0.5, score: 300,  color: '#aaf' },
        swarm:   { hp: 8,   r: 6,  speed: 3.5, score: 50,   color: '#8f8' },
        boss:    { hp: 500, r: 36, speed: 0.8, score: 2000, color: '#ffd700' }
    };

    function createEnemy(x, y, type) {
        const d = ENEMY_DEFS[type];
        return {
            x: x, y: y, type: type,
            hp: d.hp, maxHp: d.hp, r: d.r,
            speed: d.speed, score: d.score, color: d.color,
            alive: true,
            t: Math.random() * Math.PI * 2,
            fireTimer: 1 + Math.random() * 2,
            dirTimer: 0, dx: 0, dy: 1,
            bossAngle: 0
        };
    }

    function updateEnemy(e, dt) {
        e.t += dt;
        const spd = e.speed * 60;

        switch (e.type) {
            case 'drone':
                e.y += spd * dt;
                e.x += Math.sin(e.t * 2.5) * 1.5;
                break;

            case 'fighter':
                e.y += spd * dt;
                e.fireTimer -= dt;
                if (e.fireTimer <= 0 && player.alive) {
                    e.fireTimer = 1.5 + Math.random() * 0.5;
                    const a = Math.atan2(player.y - e.y, player.x - e.x);
                    createBullet(enemyBullets, e.x, e.y, Math.cos(a) * 350, Math.sin(a) * 350, 3, 8, '#f80');
                }
                break;

            case 'tank':
                e.y += spd * dt;
                break;

            case 'bomber':
                if (player.alive) {
                    const a = Math.atan2(player.y - e.y, player.x - e.x);
                    e.x += Math.cos(a) * spd * dt;
                    e.y += Math.sin(a) * spd * dt;
                    // Explode on contact
                    if (collides(e.x, e.y, e.r, player.x, player.y, player.r + 10)) {
                        e.alive = false;
                        bigBurst(e.x, e.y);
                        sndExplode();
                        player.takeDmg(25);
                        return;
                    }
                } else {
                    e.y += spd * dt;
                }
                break;

            case 'sniper':
                if (e.y < 80) e.y += spd * dt;
                e.fireTimer -= dt;
                if (e.fireTimer <= 0 && player.alive) {
                    e.fireTimer = 2;
                    const a = Math.atan2(player.y - e.y, player.x - e.x);
                    createBullet(enemyBullets, e.x, e.y, Math.cos(a) * 540, Math.sin(a) * 540, 2.5, 12, '#aaf');
                }
                break;

            case 'swarm':
                e.dirTimer -= dt;
                if (e.dirTimer <= 0) {
                    e.dirTimer = 0.3 + Math.random() * 0.5;
                    const a = Math.random() * Math.PI * 2;
                    e.dx = Math.cos(a);
                    e.dy = Math.sin(a) * 0.5 + 0.5;
                }
                e.x += e.dx * spd * dt;
                e.y += e.dy * spd * dt;
                e.x = Math.max(e.r, Math.min(W - e.r, e.x));
                break;

            case 'boss':
                if (e.y < 100) {
                    e.y += spd * dt;
                } else {
                    e.x += Math.sin(e.t * 1.2) * 2;
                }
                e.bossAngle += dt * 0.8;
                e.fireTimer -= dt;
                if (e.fireTimer <= 0) {
                    e.fireTimer = 0.6;
                    for (let i = 0; i < 8; i++) {
                        const a = (Math.PI * 2 / 8) * i + e.bossAngle;
                        createBullet(enemyBullets, e.x, e.y, Math.cos(a) * 250, Math.sin(a) * 250, 4, 10, '#ffd700');
                    }
                }
                break;
        }

        if (e.y > H + 60 || e.x < -60 || e.x > W + 60) e.alive = false;
    }

    function enemyTakeDmg(e, dmg) {
        e.hp -= dmg;
        burst(e.x, e.y, e.color, 5, 2, 0.3);
        if (e.hp <= 0) {
            e.alive = false;
            burst(e.x, e.y, e.color, 20, 5, 0.5);
            if (e.type === 'boss') {
                bigBurst(e.x, e.y);
                shake(15, 0.5);
                screenFlash();
                vibrate(150);
            } else {
                shake(3, 0.1);
            }
            sndExplode();
            addScore(e.score);
            comboKill();
            if (Math.random() < 0.18) spawnPowerup(e.x, e.y);
        }
    }

    function drawEnemy(e) {
        X.save();
        X.shadowColor = e.color;
        X.shadowBlur = 10;

        if (e.type === 'tank') {
            X.fillStyle = e.color + '88';
            X.strokeStyle = e.color;
            X.lineWidth = 2;
            X.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
            X.strokeRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
        } else if (e.type === 'boss') {
            X.translate(e.x, e.y);
            X.rotate(e.bossAngle);
            const grad = X.createRadialGradient(0, 0, 5, 0, 0, e.r);
            grad.addColorStop(0, '#ff0');
            grad.addColorStop(1, '#f80');
            X.fillStyle = grad;
            X.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i;
                const rr = i % 2 === 0 ? e.r : e.r * 0.65;
                if (i === 0) X.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
                else X.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
            X.closePath();
            X.fill();
            X.strokeStyle = '#ff0';
            X.lineWidth = 2;
            X.stroke();
        } else {
            X.fillStyle = e.color + '88';
            X.strokeStyle = e.color;
            X.lineWidth = 1.5;
            X.beginPath();
            X.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            X.fill();
            X.stroke();
        }
        X.shadowBlur = 0;
        X.restore();

        // Health bar
        if (e.hp < e.maxHp) {
            const bw = e.r * 2;
            const bx = e.x - e.r;
            const by = e.y - e.r - 8;
            X.fillStyle = '#333';
            X.fillRect(bx, by, bw, 3);
            const hpColor = e.hp / e.maxHp > 0.5 ? '#4f4' : (e.hp / e.maxHp > 0.25 ? '#ff0' : '#f44');
            X.fillStyle = hpColor;
            X.fillRect(bx, by, bw * (e.hp / e.maxHp), 3);
        }
    }

    /* ================================================================
       GAME STATE
       ================================================================ */
    let state = 'start';
    let score = 0, wave = 1, kills = 0;
    let comboCount = 0, comboTimer = 0;
    let waveEnemies = 0, waveSpawned = 0, spawnTimer = 0, waveDelay = 0;
    let bestScore = +(localStorage.getItem('hkSpaceBest') || 0);

    /* ================================================================
       SCORE & COMBO
       ================================================================ */
    function addScore(v) {
        let mult = Math.max(1, comboCount);
        if (player.doubleScore > 0) mult *= 2;
        score += v * mult;
    }

    function comboKill() {
        comboCount++;
        comboTimer = 2;
        kills++;
        if (comboCount >= 3) {
            const ct = document.getElementById('comboText');
            if (ct) {
                ct.textContent = comboCount + 'x COMBO!';
                ct.classList.add('show');
                setTimeout(() => ct.classList.remove('show'), 800);
            }
        }
    }

    /* ================================================================
       WAVE SYSTEM
       ================================================================ */
    function setupWave() {
        waveEnemies = (wave % 5 === 0) ? 1 : (5 + wave * 3);
        waveSpawned = 0;
        spawnTimer = 0;
        waveDelay = 2;
        announceWave(wave);
        if (wave % 5 === 0) showBossWarning();
    }

    function spawnEnemy() {
        const x = Math.random() * (W - 100) + 50;
        const y = -40;
        const diff = DIFFICULTY[currentDifficulty];

        if (wave % 5 === 0) {
            const e = createEnemy(W / 2, y, 'boss');
            e.hp = Math.floor((500 + wave * 50) * diff.enemyHpMult);
            e.maxHp = e.hp;
            enemies.push(e);
            sndBoss();
            return;
        }

        const r = Math.random();
        let type = 'drone';
        if      (wave >= 6 && r < 0.08) type = 'swarm';
        else if (wave >= 5 && r < 0.12) type = 'sniper';
        else if (wave >= 4 && r < 0.20) type = 'tank';
        else if (wave >= 3 && r < 0.32) type = 'bomber';
        else if (wave >= 2 && r < 0.45) type = 'fighter';

        if (type === 'swarm') {
            const count = 8 + Math.floor(Math.random() * 5);
            for (let i = 0; i < count; i++) {
                const sx = x + (Math.random() - 0.5) * 100;
                const sy = y - Math.random() * 60;
                const e = createEnemy(sx, sy, 'swarm');
                e.hp = Math.floor(e.hp * diff.enemyHpMult);
                e.maxHp = e.hp;
                e.speed *= diff.enemySpeedMult * (1 + wave * 0.04);
                enemies.push(e);
            }
            waveSpawned += count - 1;
        } else {
            const e = createEnemy(x, y, type);
            const scaling = 1 + wave * 0.12;
            e.hp = Math.floor(e.hp * scaling * diff.enemyHpMult);
            e.maxHp = e.hp;
            e.speed *= diff.enemySpeedMult * (1 + wave * 0.04);
            enemies.push(e);
        }
    }

    /* ================================================================
       UI HELPERS
       ================================================================ */
    function showOverlay(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('show');
    }
    function hideOverlay(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('show');
    }

    function showBossWarning() {
        const el = document.getElementById('bossWarning');
        if (!el) return;
        el.classList.add('active');
        setTimeout(() => el.classList.remove('active'), 3000);
    }

    function announceWave(n) {
        const el = document.getElementById('waveAnn');
        if (!el) return;
        el.textContent = (n % 5 === 0) ? '⚠ BOSS WAVE ' + n : 'WAVE ' + n;
        el.style.transition = '';
        el.style.opacity = '1';
        el.style.transform = 'translateX(-50%) scale(1.2)';
        setTimeout(() => {
            el.style.transition = 'opacity 1s, transform 1s';
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) scale(1)';
            setTimeout(() => { el.style.transition = ''; }, 1100);
        }, 1500);
    }

    /* ================================================================
       HUD — throttled DOM updates
       ================================================================ */
    let prevHud = { score: -1, wave: -1, kills: -1, hp: -1, shield: -1, weapon: -1 };

    function updateHUD() {
        if (score !== prevHud.score) {
            const el = document.getElementById('scoreVal');
            if (el) el.textContent = score.toLocaleString();
            prevHud.score = score;
        }
        if (wave !== prevHud.wave) {
            const el = document.getElementById('waveVal');
            if (el) el.textContent = wave;
            prevHud.wave = wave;
        }
        if (kills !== prevHud.kills) {
            const el = document.getElementById('killsVal');
            if (el) el.textContent = kills;
            prevHud.kills = kills;
        }
        const hpPct = Math.max(0, Math.round(player.hp / player.maxHp * 100));
        if (hpPct !== prevHud.hp) {
            const el = document.getElementById('healthFill');
            if (el) el.style.width = hpPct + '%';
            prevHud.hp = hpPct;
        }
        const shPct = Math.max(0, Math.round(player.shield / player.maxShield * 100));
        if (shPct !== prevHud.shield) {
            const el = document.getElementById('shieldFill');
            if (el) el.style.width = shPct + '%';
            prevHud.shield = shPct;
        }
        if (player.weapon !== prevHud.weapon) {
            const el = document.getElementById('weaponInd');
            if (el) {
                el.innerHTML = player.weapons.map(function(w, i) {
                    return '<div class="wp' + (i === player.weapon ? ' active' : '') + '">' + w + '</div>';
                }).join('');
            }
            prevHud.weapon = player.weapon;
        }
    }

    /* ================================================================
       GAME LIFECYCLE
       ================================================================ */
    function startGame() {
        state = 'play';
        score = 0; wave = 1; kills = 0;
        comboCount = 0; comboTimer = 0;
        enemies = [];
        playerBullets = [];
        enemyBullets = [];
        particles = [];
        powerups = [];
        clearScreen = false;

        const diff = DIFFICULTY[currentDifficulty];
        player.init();
        player.maxHp = Math.round(100 * diff.hpMult);
        player.hp = player.maxHp;

        prevHud = { score: -1, wave: -1, kills: -1, hp: -1, shield: -1, weapon: -1 };
        setupWave();
        updateHUD();

        hideOverlay('startScreen');
        hideOverlay('gameOverScreen');
        hideOverlay('pauseScreen');
        const hud = document.getElementById('hud');
        if (hud) hud.classList.add('show');
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) pauseBtn.style.display = 'flex';
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.style.display = 'flex';

        if (AC) AC.resume().catch(function() {});
    }

    function pauseGame() {
        if (state !== 'play') return;
        state = 'pause';
        // Update pause stats
        const ps = document.getElementById('pauseScore');
        const pw = document.getElementById('pauseWave');
        const pk = document.getElementById('pauseKills');
        if (ps) ps.textContent = score.toLocaleString();
        if (pw) pw.textContent = wave;
        if (pk) pk.textContent = kills;
        showOverlay('pauseScreen');
        // Persist progress
        try {
            localStorage.setItem('hkSpaceLastScore', score);
            localStorage.setItem('hkSpaceLastWave', wave);
            localStorage.setItem('hkSpaceLastKills', kills);
        } catch (e) {}
    }

    function resumeGame() {
        if (state !== 'pause') return;
        state = 'play';
        hideOverlay('pauseScreen');
    }

    function goMainMenu() {
        try {
            localStorage.setItem('hkSpaceLastScore', score);
            localStorage.setItem('hkSpaceLastWave', wave);
            localStorage.setItem('hkSpaceLastKills', kills);
        } catch (e) {}
        state = 'start';
        hideOverlay('pauseScreen');
        showOverlay('startScreen');
        const hud = document.getElementById('hud');
        if (hud) hud.classList.remove('show');
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) pauseBtn.style.display = 'none';
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.style.display = 'none';
    }

    function quitGame() {
        try {
            localStorage.setItem('hkSpaceLastScore', score);
            localStorage.setItem('hkSpaceLastWave', wave);
            localStorage.setItem('hkSpaceLastKills', kills);
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('hkSpaceBest', bestScore);
            }
        } catch (e) {}
        state = 'start';
        hideOverlay('pauseScreen');
        showOverlay('startScreen');
        const hud = document.getElementById('hud');
        if (hud) hud.classList.remove('show');
        const pauseBtnQ = document.getElementById('pauseBtn');
        if (pauseBtnQ) pauseBtnQ.style.display = 'none';
        const settingsBtnQ = document.getElementById('settingsBtn');
        if (settingsBtnQ) settingsBtnQ.style.display = 'none';
        enemies = []; playerBullets = []; enemyBullets = [];
        particles = []; powerups = [];
    }

    function gameOver() {
        state = 'gameover';
        try {
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('hkSpaceBest', bestScore);
            }
            localStorage.setItem('hkSpaceLastScore', score);
            localStorage.setItem('hkSpaceLastWave', wave);
            localStorage.setItem('hkSpaceLastKills', kills);
        } catch (e) {}

        const fs = document.getElementById('finalScore');
        const fw = document.getElementById('finalWave');
        const fk = document.getElementById('finalKills');
        const bs = document.getElementById('bestScore');
        if (fs) fs.textContent = score.toLocaleString();
        if (fw) fw.textContent = wave;
        if (fk) fk.textContent = kills;
        if (bs) bs.textContent = bestScore.toLocaleString();

        const hud = document.getElementById('hud');
        if (hud) hud.classList.remove('show');
        const pauseBtnGO = document.getElementById('pauseBtn');
        if (pauseBtnGO) pauseBtnGO.style.display = 'none';
        const settingsBtnGO = document.getElementById('settingsBtn');
        if (settingsBtnGO) settingsBtnGO.style.display = 'none';
        setTimeout(function() { showOverlay('gameOverScreen'); }, 800);
    }

    /* ================================================================
       INPUT SYSTEM
       ================================================================ */
    const keys = {};
    const mouse = { x: 0, y: 0, down: false };

    // Keyboard
    window.addEventListener('keydown', function(e) {
        const k = e.key.toLowerCase();
        keys[k] = true;
        if (e.key === ' ' && state === 'start') {
            if (AC) AC.resume().catch(function() {});
            startGame();
            e.preventDefault();
        }
        if (e.key === 'Escape') {
            if (state === 'play') pauseGame();
            else if (state === 'pause') resumeGame();
        }
        if (k >= '1' && k <= '3' && state === 'play') {
            player.weapon = parseInt(k) - 1;
        }
    });
    window.addEventListener('keyup', function(e) { keys[e.key.toLowerCase()] = false; });

    // Mouse
    window.addEventListener('mousemove', function(e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mousedown', function(e) {
        mouse.down = true;
        if (AC) AC.resume().catch(function() {});
    });
    window.addEventListener('mouseup', function() { mouse.down = false; });

    // Touch — Virtual Joystick
    let joystickActive = false;
    let joystickCenter = { x: 0, y: 0 };
    let joystickDelta = { x: 0, y: 0 };
    const joystickArea = document.getElementById('joystickArea');
    const joystickKnob = document.getElementById('joystickKnob');
    const joystickBase = document.getElementById('joystickBase');

    if (joystickArea) {
        joystickArea.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (AC) AC.resume().catch(function() {});
            joystickActive = true;
            if (joystickBase) {
                const rect = joystickBase.getBoundingClientRect();
                joystickCenter.x = rect.left + rect.width / 2;
                joystickCenter.y = rect.top + rect.height / 2;
            }
        }, { passive: false });

        joystickArea.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (!joystickActive) return;
            const t = e.touches[0];
            let dx = t.clientX - joystickCenter.x;
            let dy = t.clientY - joystickCenter.y;
            const dist = Math.hypot(dx, dy);
            const maxR = 35;
            if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
            joystickDelta.x = dx / maxR;
            joystickDelta.y = dy / maxR;
            if (joystickKnob) {
                joystickKnob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
            }
        }, { passive: false });

        joystickArea.addEventListener('touchend', function(e) {
            e.preventDefault();
            joystickActive = false;
            joystickDelta.x = 0;
            joystickDelta.y = 0;
            if (joystickKnob) joystickKnob.style.transform = 'translate(-50%, -50%)';
        }, { passive: false });
    }

    // Fire button
    let mobileFireDown = false;
    const fireBtn = document.getElementById('fireBtn');
    if (fireBtn) {
        fireBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            mobileFireDown = true;
            if (AC) AC.resume().catch(function() {});
        }, { passive: false });
        fireBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            mobileFireDown = false;
        }, { passive: false });
    }

    // Weapon switch
    const weaponSwitchBtn = document.getElementById('weaponSwitchBtn');
    if (weaponSwitchBtn) {
        weaponSwitchBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (state === 'play') player.weapon = (player.weapon + 1) % 3;
        }, { passive: false });
    }

    /* ================================================================
       BUTTON EVENT LISTENERS
       ================================================================ */
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', startGame);

    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) pauseBtn.addEventListener('click', function() { pauseGame(); });

    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);

    const mainMenuBtn = document.getElementById('mainMenuBtn');
    if (mainMenuBtn) mainMenuBtn.addEventListener('click', goMainMenu);

    const quitBtn = document.getElementById('quitBtn');
    if (quitBtn) quitBtn.addEventListener('click', quitGame);

    // Settings
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', function() {
            settingsPanel.classList.toggle('hidden');
        });
    }
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', function() {
            soundEnabled = !soundEnabled;
            this.classList.toggle('on');
        });
    }
    const vibrationToggle = document.getElementById('vibrationToggle');
    if (vibrationToggle) {
        vibrationToggle.addEventListener('click', function() {
            vibrationEnabled = !vibrationEnabled;
            this.classList.toggle('on');
        });
    }

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            document.querySelectorAll('.diff-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentDifficulty = btn.dataset.diff;
        });
    });

    // Start screen — click/tap to start
    const startScreenEl = document.getElementById('startScreen');
    if (startScreenEl) {
        startScreenEl.addEventListener('click', function(e) {
            // Don't start if clicking on difficulty buttons
            if (e.target.closest('.diff-btn') || e.target.closest('.difficulty-select')) return;
            if (state === 'start') {
                if (AC) AC.resume().catch(function() {});
                startGame();
            }
        });
    }

    /* ================================================================
       MAIN GAME LOOP
       ================================================================ */
    let lastT = -1;

    function loop(ts) {
        requestAnimationFrame(loop);
        if (lastT < 0) { lastT = ts; }
        const dt = Math.min((ts - lastT) / 1000, 0.05);
        lastT = ts;

        // Always animate stars
        updateStars(dt);

        /* ── GAME LOGIC (play state only) ── */
        if (state === 'play') {
            player.update(dt);

            // Wave spawning
            if (waveDelay > 0) {
                waveDelay -= dt;
            } else {
                spawnTimer -= dt;
                if (spawnTimer <= 0 && waveSpawned < waveEnemies) {
                    spawnEnemy();
                    waveSpawned++;
                    const diff = DIFFICULTY[currentDifficulty];
                    spawnTimer = (wave % 5 === 0) ? 0.5
                        : Math.max(0.3, (1.2 - wave * 0.05) * diff.spawnRateMult);
                }
            }

            // Next wave
            if (waveSpawned >= waveEnemies && enemies.length === 0) {
                wave++;
                setupWave();
            }

            // Combo timer
            if (comboTimer > 0) {
                comboTimer -= dt;
                if (comboTimer <= 0) comboCount = 0;
            }

            // Update bullets
            updateBullets(playerBullets, dt);
            updateBullets(enemyBullets, dt);

            // Collision: player bullets vs enemies
            for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
                const b = playerBullets[bi];
                for (let ei = 0; ei < enemies.length; ei++) {
                    const e = enemies[ei];
                    if (e.alive && collides(b.x, b.y, b.r, e.x, e.y, e.r)) {
                        playerBullets.splice(bi, 1);
                        enemyTakeDmg(e, b.dmg);
                        break;
                    }
                }
            }

            // Collision: enemy bullets vs player
            if (player.alive) {
                for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
                    const b = enemyBullets[bi];
                    if (collides(b.x, b.y, b.r, player.x, player.y, player.r)) {
                        enemyBullets.splice(bi, 1);
                        player.takeDmg(b.dmg);
                    }
                }
            }

            // Update enemies
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                updateEnemy(e, dt);
                // Contact damage (non-bomber, bomber handled in its update)
                if (e.alive && e.type !== 'bomber' && player.alive &&
                    collides(e.x, e.y, e.r, player.x, player.y, player.r)) {
                    player.takeDmg(15);
                    e.alive = false;
                    burst(e.x, e.y, e.color, 15, 4, 0.4);
                    sndExplode();
                }
                if (!e.alive) enemies.splice(i, 1);
            }

            // Power-ups
            updatePowerups(dt);

            // Bomb clear screen
            if (clearScreen) {
                for (let i = 0; i < enemies.length; i++) {
                    burst(enemies[i].x, enemies[i].y, enemies[i].color, 15, 5, 0.5);
                    addScore(enemies[i].score);
                    kills++;
                }
                enemies = [];
                enemyBullets = [];
                clearScreen = false;
                shake(12, 0.3);
                sndExplode();
                screenFlash();
                vibrate(100);
            }

            // Death check
            if (!player.alive) gameOver();

            updateHUD();
        }

        // Particles always update
        updateParticles(dt);
        if (shakeT > 0) shakeT -= dt;

        /* ── DRAW ── */
        X.fillStyle = '#0a0a12';
        X.fillRect(0, 0, W, H);

        X.save();
        if (shakeT > 0) {
            X.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
        }

        drawStars();

        if (state === 'play' || state === 'gameover') {
            drawPowerups();
            for (let i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);
            drawBullets(playerBullets);
            drawBullets(enemyBullets);
            if (player.alive) player.draw();

            // Double score indicator
            if (state === 'play' && player.doubleScore > 0) {
                X.fillStyle = '#f0f';
                X.font = 'bold 18px Orbitron, monospace';
                X.textAlign = 'center';
                X.globalAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;
                X.fillText('2X SCORE', W / 2, 70);
                X.globalAlpha = 1;
            }
        }

        drawParticles();
        X.restore();
    }

    // Kick off
    requestAnimationFrame(loop);

})();
