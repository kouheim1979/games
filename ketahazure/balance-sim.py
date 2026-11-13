#!/usr/bin/env python3
"""桁外れ の動作確認とバランス測定。

    python3 ketahazure/balance-sim.py smoke                 # 起動して1ステージ遊び、エラーが出ないか確かめる
    python3 ketahazure/balance-sim.py growth smart 100      # ステージごとの得点分布（失敗なし・飛び級なし）
    python3 ketahazure/balance-sim.py runs smart 100        # 通しで遊んだときの到達ステージとクリア率

方針は smart（札をよく選ぶ）/ casual（札はでたらめ、置き場所はおまかせ）/ random（すべてでたらめ）。
index.html の window.KETA（確認用の窓口）だけを使い、描画なしで時間を進める。
必要なもの: Python の playwright と Chromium（`pip install playwright && playwright install chromium`）。
"""
import asyncio
import json
import statistics as st
import sys
from pathlib import Path

from playwright.async_api import async_playwright

URL = (Path(__file__).resolve().parent / "index.html").as_uri()

BOT_JS = r"""
window.SIM = (() => {
  const { G, BAL, api } = KETA;
  const cnt = t => api.countType(t), mulN = () => cnt('x') + cnt('g') + cnt('d');
  // smart の札えらび。数字が大きいほど優先する
  function scoreCard(o) {
    const c = o.c, st = G.stage, nx = cnt('x'), nm = mulN();
    switch (c.id) {
      case 'lvx2': return 100 + nx * 3;
      case 'lvx': return nx >= 5 ? 60 + nx * 2 : 20 + nx * 3;
      case 'X3': return 48; case 'x4': return 40; case 'x2': return 30; case 'kaiso': return 45;
      case 'fukuri': return nx >= 4 ? 55 : 30;
      case 'okawari': return 50;
      case 'crit': return 34 + nm;
      case 'w1': return nm >= 6 ? 46 : 18;
      case 'b1': case 'b2': return nm >= 5 ? 30 + nm * 1.5 + (c.id === 'b2' ? 6 : 0) : 12;
      case 'z1': case 'z2': return nm >= 6 ? 26 + nm + (c.id === 'z2' ? 5 : 0) : 10;
      case 'g2': return 26; case 'd2': return 28; case 'lv4': return 14 + nm;
      case 'twin': return 30; case 'oikaze': return 24; case 'ball': return 22;
      case 's1': case 's2': return 18 + (c.id === 's2' ? 4 : 0);
      case 'omatsuri': return 20; case 'rensa': return 18; case 'kabe': return 16; case 'suki': return 16;
      case 'zenya': return 14; case 'kayaku': return 14;
      case 'a3': return st <= 3 ? 24 : 8; case 'lva': return st <= 4 ? 16 : 6;
      case 'odama': return st <= 3 ? 14 : 9; case 'nail': return st <= 3 ? 14 : 9;
      case 'masu': return 12; case 'keiki': return 12; case 'f2': return 12; case 'hashi': return 10; case 'shime': return 10;
      case 'reroll': return 2;
    }
    return 5;
  }
  const anyCard = off => (Math.random() * off.length) | 0;
  const POL = {
    smart: { pick: off => { let b = 0, bs = -1; off.forEach((o, i) => { const s = scoreCard(o) + Math.random() * 4; if (s > bs) { bs = s; b = i; } }); return b; },
             place: () => api.autoPlace(), dropX: () => api.dropSpot().x + (Math.random() - 0.5) * 10 },
    casual: { pick: anyCard, place: () => api.autoPlace(), dropX: () => api.dropSpot().x + (Math.random() - 0.5) * 70 },
    random: { pick: anyCard, dropX: () => 40 + Math.random() * 460,
              place: () => { let g = 80; while (G.phase === 'place' && g-- > 0) api.placeAt(G.pegs[(Math.random() * G.pegs.length) | 0]); } }
  };
  // fail=false: ノルマ未達でも進める（伸び方だけを見る）。fail=true: 本番どおり
  function run(polName, maxStage, fail) {
    const pol = POL[polName]; G.headless = true; KETA.freeze = true; BAL.noFail = !fail;
    api.startRun();
    const out = []; let guard = 0, t0 = G.t;
    while (guard++ < 4e6) {
      if (G.phase === 'play') {
        if (G.ballsLeft > 0 && G.dropCd <= 0 && G.balls.length < 4) api.dropBall(pol.dropX());
        api.update(1 / 30);
      } else if (G.phase === 'clear') {
        out.push({ st: G.stage, lg: Math.log10(Math.max(1, G.score)), q: Math.log10(G.quota), dur: G.t - t0, landed: G.landed, jump: G.clearInfo.jump });
        if (G.stage >= maxStage || (fail && G.unitIdx >= 18)) break;
        api.afterClear(); if (G.phase === 'ending') { G.phase = 'clear'; api.afterClear(); }
        t0 = G.t;
      } else if (G.phase === 'reward') { api.takeCard(G.offer[pol.pick(G.offer)]); }
      else if (G.phase === 'place') { pol.place(); }
      else { out.push({ st: G.stage, lg: Math.log10(Math.max(1, G.score)), q: Math.log10(G.quota), dead: true }); break; }
    }
    return { out, won: G.unitIdx >= 18, cards: G.picks.length, time: out.reduce((t, o) => t + (o.dur || 0), 0), stuck: G.stats.ghosts || 0 };
  }
  return { run };
})();
"""


async def open_page(p, mobile=False):
    browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    kw = dict(viewport={"width": 390, "height": 844})
    if mobile:
        kw.update(device_scale_factor=2, has_touch=True, is_mobile=True)
    page = await browser.new_page(**kw)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    await page.goto(URL)
    await page.wait_for_timeout(400)
    return browser, page, errors


async def smoke(p):
    browser, page, errors = await open_page(p, mobile=True)
    box = await page.evaluate("(() => { const r = document.getElementById('c').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")

    async def tap(reg_id):
        r = await page.evaluate("id => { const r = KETA.UI.regs.find(r => r.id === id); return r ? [r.x + r.w / 2, r.y + r.h / 2, KETA.L.trayY + KETA.L.trayH] : null; }", reg_id)
        assert r, f"ボタンが見つからない: {reg_id}"
        await page.mouse.click(box[0] + r[0] * box[2] / 540, box[1] + r[1] * box[3] / r[2])
        await page.wait_for_timeout(200)

    await tap("start")          # 初回は「あそびかた」が開く
    await tap("hclose")
    await page.wait_for_timeout(800)
    for _ in range(80):         # 画面の中央をタップして玉を落としつづける
        state = await page.evaluate("({ phase: KETA.G.phase, left: KETA.G.ballsLeft })")
        if state["phase"] != "play":
            break
        if state["left"] > 0:
            await page.mouse.click(box[0] + box[2] / 2, box[1] + box[3] / 2)
        await page.wait_for_timeout(400)
    state = await page.evaluate("({ phase: KETA.G.phase, stage: KETA.G.stage, score: KETA.G.score, quota: KETA.G.quota })")
    await browser.close()
    ok = state["phase"] in ("clear", "reward") and state["score"] >= state["quota"] and not errors
    print("smoke:", "OK" if ok else "NG", json.dumps(state, ensure_ascii=False), "errors:", errors[:5])
    return 0 if ok else 1


async def measure(p, mode, policy, runs, max_stage):
    browser, page, errors = await open_page(p)
    await page.add_script_tag(content=BOT_JS)
    fail = mode == "runs"
    if not fail:
        await page.evaluate("KETA.BAL.maxJump = 0")
    res = [await page.evaluate("([p, m, f]) => SIM.run(p, m, f)", [policy, max_stage, fail]) for _ in range(runs)]
    await browser.close()
    if errors:
        print("ページのエラー:", errors[:5])
    if fail:
        wins = [r for r in res if r["won"]]
        reach = sorted(r["out"][-1]["st"] for r in res)
        med = lambda xs: st.median(xs) if xs else 0
        print(f"policy={policy} runs={runs}  クリア {len(wins)}/{runs} ({100 * len(wins) / runs:.0f}%)")
        print(f"  到達ステージ: 最小 {reach[0]} / 25% {reach[len(reach) // 4]} / 中央 {reach[len(reach) // 2]} / 75% {reach[3 * len(reach) // 4]} / 最大 {reach[-1]}")
        print(f"  クリアした回: 遊んだステージ数 中央 {med([len(r['out']) for r in wins])}, 札 {med([r['cards'] for r in wins])} 枚, ゲーム内時間 {med([r['time'] for r in wins]):.0f} 秒")
        print(f"  飛び級したステージの割合 {100 * sum(1 for r in res for o in r['out'] if o.get('jump')) / max(1, sum(len(r['out']) for r in res)):.0f}%  ひっかかった玉 {sum(r['stuck'] for r in res)}")
    else:
        print(f"policy={policy} runs={runs}  ステージごとの log10(得点)")
        print("st |   p5    p10    p20    p30    p50    p75 | ノルマ | 秒   入った玉")
        for s in range(1, max_stage + 1):
            rows = [o for r in res for o in r["out"] if o["st"] == s]
            if not rows:
                break
            v = sorted(o["lg"] for o in rows)
            q = lambda f: v[min(len(v) - 1, int(f * len(v)))]
            print(f"{s:2d} | {q(.05):6.2f} {q(.1):6.2f} {q(.2):6.2f} {q(.3):6.2f} {q(.5):6.2f} {q(.75):6.2f} | {rows[0]['q']:6.2f} | {st.mean(o['dur'] for o in rows):4.1f} {st.mean(o['landed'] for o in rows):6.1f}")
    return 0


async def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "smoke"
    async with async_playwright() as p:
        if mode == "smoke":
            return await smoke(p)
        if mode not in ("growth", "runs"):
            print(__doc__)
            return 2
        policy = sys.argv[2] if len(sys.argv) > 2 else "smart"
        runs = int(sys.argv[3]) if len(sys.argv) > 3 else 60
        max_stage = int(sys.argv[4]) if len(sys.argv) > 4 else (70 if mode == "runs" else 34)
        return await measure(p, mode, policy, runs, max_stage)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
