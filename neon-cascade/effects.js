import { COLORS, SIZE } from './engine.js';

export class Effects {
  constructor(canvas, cells) {
    this.canvas = canvas;
    this.cells = cells;
    this.context = canvas.getContext('2d');
    this.path = [];
    this.bursts = [];
    this.rings = [];
    this.labels = [];
    this.dirty = true;
    this.reduced = false;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  resize() {
    const frame = this.canvas.getBoundingClientRect();
    const first = this.cells[0].getBoundingClientRect();
    const right = this.cells[1].getBoundingClientRect();
    const below = this.cells[SIZE].getBoundingClientRect();
    this.width = frame.width;
    this.height = frame.height;
    this.x = first.left - frame.left + first.width / 2;
    this.y = first.top - frame.top + first.height / 2;
    this.dx = right.left - first.left;
    this.dy = below.top - first.top;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(frame.width * ratio);
    this.canvas.height = Math.round(frame.height * ratio);
    this.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.dirty = true;
  }

  center(index) {
    return { x: this.x + (index % SIZE) * this.dx, y: this.y + Math.floor(index / SIZE) * this.dy };
  }

  select(path, color) {
    this.path = [...path];
    this.color = COLORS[color];
    this.dirty = true;
  }

  reset() {
    this.select([], 0);
    this.bursts.length = 0;
    this.rings.length = 0;
    this.labels.length = 0;
  }

  setReduced(reduced) {
    this.reduced = reduced;
    if (reduced) {
      this.bursts.length = 0;
      this.rings.length = 0;
      this.labels.length = 0;
      this.dirty = true;
    }
  }

  burst(removed, blasts, index, label, now) {
    if (this.reduced) return;
    const count = removed.length > 18 ? 4 : 7;
    for (const piece of removed) {
      const origin = this.center(piece.index);
      for (let p = 0; p < count; p++) {
        const angle = (p + Math.random()) * Math.PI * 2 / count;
        const speed = 38 + Math.random() * 115;
        this.bursts.push({
          ...origin, color: COLORS[piece.color], start: now, life: 250 + Math.random() * 310,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          size: 1.5 + Math.random() * 3.2, angle,
        });
      }
    }
    this.bursts = this.bursts.slice(-340);
    for (const blast of blasts) {
      this.rings.push({ ...this.center(blast.index), radius: this.dx * (blast.radius + 0.75), color: COLORS[blast.color], start: now });
    }
    this.rings = this.rings.slice(-24);
    this.labels.push({ ...this.center(index), label, start: now });
    this.labels = this.labels.slice(-8);
  }

  draw(now) {
    const context = this.context;
    if (!context || (!this.dirty && !this.bursts.length && !this.rings.length && !this.labels.length)) return;
    this.dirty = false;
    context.clearRect(0, 0, this.width, this.height);
    this.drawPath(context);

    for (const ring of this.rings) {
      const life = (now - ring.start) / 480;
      if (life >= 1) continue;
      context.beginPath();
      context.arc(ring.x, ring.y, 8 + ring.radius * (1 - (1 - life) ** 2), 0, Math.PI * 2);
      context.globalAlpha = (1 - life) * 0.8;
      context.lineWidth = 5 * (1 - life) + 1;
      context.strokeStyle = ring.color;
      context.stroke();
    }

    for (const particle of this.bursts) {
      const age = now - particle.start;
      const life = age / particle.life;
      if (life >= 1) continue;
      const t = age / 1000;
      const size = particle.size * (1 - life * 0.55);
      context.save();
      context.globalAlpha = (1 - life) ** 0.8;
      context.fillStyle = particle.color;
      context.translate(particle.x + particle.vx * t, particle.y + particle.vy * t + 115 * t * t);
      context.rotate(particle.angle + t * 5);
      context.fillRect(-size / 2, -size / 2, size * 1.5, size);
      context.restore();
    }

    context.font = 'bold 20px monospace';
    context.textAlign = 'center';
    for (const item of this.labels) {
      const life = (now - item.start) / 780;
      if (life >= 1) continue;
      const x = Math.min(this.width - 43, Math.max(43, item.x));
      const y = Math.max(25, item.y - 12) - 17 * life;
      context.globalAlpha = Math.min(1, 2.5 * (1 - life));
      context.strokeStyle = '#151923';
      context.lineWidth = 5;
      context.strokeText(item.label, x, y);
      context.fillStyle = '#d4fb79';
      context.fillText(item.label, x, y);
    }
    context.globalAlpha = 1;
    this.rings = this.rings.filter((ring) => now - ring.start < 480);
    this.bursts = this.bursts.filter((particle) => now - particle.start < particle.life);
    this.labels = this.labels.filter((item) => now - item.start < 780);
  }

  drawPath(context) {
    if (!this.path.length) return;
    const points = this.path.map((index) => this.center(index));
    context.save();
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.shadowBlur = this.reduced ? 0 : 10;
    context.shadowColor = this.color;
    context.strokeStyle = this.color;
    context.lineWidth = 9;
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = '#f4fff7';
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = '#f4fff7';
    for (const point of points) {
      context.beginPath();
      context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}

export class Sound {
  constructor(enabled) { this.enabled = enabled; }

  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        this.context = new Audio();
        this.volume = this.context.createGain();
        this.volume.gain.value = 0.30;
        this.volume.connect(this.context.destination);
      }
      this.context.resume().catch(() => {});
    } catch {
      // The board remains playable when browser audio is unavailable.
    }
  }

  toggle(enabled) {
    this.enabled = enabled;
    if (enabled) this.unlock();
    if (this.volume) this.volume.gain.value = enabled ? 0.30 : 0;
  }

  tone(note, offset, length, level, type = 'sine', endNote = note) {
    if (!this.enabled || this.context?.state !== 'running') return;
    const time = this.context.currentTime + offset;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(440 * 2 ** ((note - 69) / 12), time);
    oscillator.frequency.exponentialRampToValueAtTime(440 * 2 ** ((endNote - 69) / 12), time + length);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + length);
    oscillator.connect(envelope).connect(this.volume);
    oscillator.start(time);
    oscillator.stop(time + length + 0.015);
  }

  pick(length) {
    const notes = [60, 62, 65, 67, 69, 72, 74, 77, 79, 81, 84];
    this.tone(notes[Math.min(length, notes.length) - 1], 0, 0.075, 0.17, 'triangle');
  }

  clear(length, blasts, drive) {
    const root = 64 + Math.min(12, length);
    const notes = length >= 5 || blasts ? [0, 4, 7, 12] : [0, 7, 12];
    const spacing = drive ? 0.027 : 0.044;
    notes.forEach((note, i) => this.tone(root + note, i * spacing, 0.20, 0.16, 'triangle'));
    if (blasts) this.tone(45, 0, 0.30, 0.45, 'sine', 29);
  }

  cue(event) {
    const cues = {
      start: [57, 64, 69], ready: [71, 74, 81], drive: [45, 57, 64, 69, 76],
      upgrade: [67, 71, 74, 79], end: [69, 64, 57], record: [60, 64, 67, 72, 76],
    };
    cues[event].forEach((note, index) => this.tone(note, index * 0.065, 0.28, 0.18, 'triangle'));
  }
}
