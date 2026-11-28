/* The flight schedule is independent of the player's input and the display frame rate. */
(() => {
  "use strict";

  const DURATION = 30;
  const PERFECT_WINDOW = 0.46;
  const FEVER_SECONDS = 5;
  const values = {star: 80, planet: 120, comet: 180, moon: 100};
  const loot = Object.keys(values);

  function randomGenerator(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let v = Math.imul(state ^ (state >>> 15), 1 | state);
      v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;
      return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeChart(day) {
    const r = randomGenerator(Number(day.replace(/-/g, "")));
    const chart = [];
    let first = 0.53;
    let wave = 0;
    while (first < DURATION - 0.14) {
      const bombTime = first + 2.12 + r() * 0.74 - Math.min(wave, 6) * 0.043;
      let at = first;
      const bend = (r() - 0.5) * 0.72;
      while (at < Math.min(bombTime - 0.33, DURATION - 0.12)) {
        const kind = loot[Math.floor(r() * loot.length)];
        chart.push({at, kind, value: values[kind], bend: bend + (r() - 0.5) * 0.23, phase: r()});
        at += 0.33 + r() * 0.13 - Math.min(wave, 5) * 0.009;
      }
      if (bombTime < DURATION - 0.17) {
        chart.push({at: bombTime, kind: "mine", value: 0, bend, phase: r()});
      }
      first = bombTime + 0.67 + r() * 0.28;
      wave++;
    }
    return chart.map((item, id) => ({...item, id}));
  }

  function encodeChallenge(day, score) {
    return "HB-" + day.slice(2).replace(/-/g, "") + "-" + score;
  }
  function parseChallenge(text) {
    const match = String(text).normalize("NFKC").toUpperCase().match(/(?:^|[^A-Z0-9])HB-(\d{2})(\d{2})(\d{2})-(\d{1,7})(?![A-Z0-9])/);
    if (!match) return null;
    const day = "20" + match[1] + "-" + match[2] + "-" + match[3];
    const booked = new Date(day + "T00:00:00Z");
    if (!Number.isFinite(booked.valueOf()) || booked.toISOString().slice(0, 10) !== day) return null;
    return {day, score: Number(match[4])};
  }

  class Flight {
    constructor(day) {
      this.day = day;
      this.chart = makeChart(day);
      this.cursor = 0;
      this.time = 0;
      this.score = 0;
      this.raw = 0;
      this.count = 0;
      this.held = false;
      this.done = false;
      this.charge = 0;
      this.feverEnd = 0;
      this.stunEnd = 0;
      this.perfects = 0;
      this.closest = null;
      this.biggest = 0;
      this.misses = 0;
      this.feverCount = 0;
      this.bites = [];
      this.eliminated = new Set();
      this.events = [];
    }
    get fever() { return this.time < this.feverEnd; }
    get stunned() { return this.time < this.stunEnd; }
    get multiplier() { return Math.min(4, 1 + Math.floor(this.count / 3)); }
    get pot() { return this.raw * this.multiplier; }
    get danger() {
      for (let i = this.cursor; i < this.chart.length; i++) {
        const o = this.chart[i];
        if (o.kind === "mine" && !this.eliminated.has(o.id)) return o;
      }
      return null;
    }
    signal(type, extra = {}) { this.events.push({type, time: this.time, ...extra}); }
    press() {
      if (!this.done) this.held = true;
    }
    release() {
      if (this.done || !this.held) return;
      this.held = false;
      const mine = this.danger;
      const gap = mine ? mine.at - this.time : Infinity;
      const perfect = this.count > 0 && !this.fever && !this.stunned && gap > 0 && gap <= PERFECT_WINDOW;
      if (perfect) {
        this.eliminated.add(mine.id);
        this.perfects++;
        const ms = Math.max(1, Math.ceil(gap * 1000));
        this.closest = this.closest === null ? ms : Math.min(this.closest, ms);
        this.bank("perfect", 3, {ms, id: mine.id});
        if (++this.charge === 3) {
          this.charge = 0;
          this.feverEnd = this.time + FEVER_SECONDS;
          this.feverCount++;
          this.signal("fever");
        }
      } else {
        this.bank("bank", 1);
      }
    }
    bank(type, bonus, extra = {}) {
      if (!this.count) return;
      const points = this.pot * bonus;
      this.score += points;
      this.biggest = Math.max(points, this.biggest);
      this.bites.push({type, points, at: this.time});
      this.signal(type, {points, count: this.count, ...extra});
      this.raw = 0;
      this.count = 0;
    }
    cross(item) {
      if (!this.held || this.stunned || this.eliminated.has(item.id)) return;
      this.eliminated.add(item.id);
      if (item.kind === "mine" && !this.fever) {
        const lost = this.pot;
        this.count = this.raw = 0;
        this.stunEnd = this.time + 0.62;
        this.misses++;
        this.bites.push({type:"hit", points:0, at:this.time});
        this.signal("hit", {lost, id:item.id});
        return;
      }
      this.count++;
      this.raw += item.kind === "mine" ? 500 : item.value;
      this.signal("eat", {kind:item.kind, id:item.id, count:this.count});
    }
    advance(target) {
      if (this.done || !Number.isFinite(target)) return;
      target = Math.min(DURATION, Math.max(this.time, target));
      while (this.cursor < this.chart.length && this.chart[this.cursor].at <= target) {
        const item = this.chart[this.cursor++];
        this.time = item.at;
        this.cross(item);
      }
      this.time = target;
      if (target >= DURATION) {
        this.bank("bank", 1, {auto:true});
        this.done = true;
        this.held = false;
        this.signal("end");
      }
    }
    drain() { return this.events.splice(0); }
  }

  globalThis.HoshiEngine = {DURATION, PERFECT_WINDOW, FEVER_SECONDS, Flight, makeChart, randomGenerator, encodeChallenge, parseChallenge};
})();
