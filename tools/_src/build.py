#!/usr/bin/env python3
"""Build each diagnosis into a self-contained tools/<id>/index.html.

Source format (tools/_src/data/*.txt):
  header lines   key: value
  T key | emoji | name | short | catch | match     (one per result type)
    desc: ...  good: a / b / c  tip: ...
  Q question text
    - option text | typeA,typeB
"""
import html, json, pathlib, random, sys

SRC = pathlib.Path(__file__).resolve().parent
TOOLS = SRC.parent


def parse(path):
    meta, types, questions = {}, {}, []
    cur_t = None
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('T '):
            key, emoji, name, short, catch, match = [x.strip() for x in line[2:].split('|')]
            cur_t = types[key] = dict(emoji=emoji, name=name, short=short, catch=catch, match=match)
        elif line.startswith('Q '):
            cur_t = None
            questions.append(dict(q=line[2:].strip(), a=[]))
        elif line.startswith('- '):
            text, keys = line[2:].rsplit('|', 1)
            questions[-1]['a'].append(dict(t=text.strip(), p=[k.strip() for k in keys.split(',')]))
        elif cur_t is not None and line.split(':', 1)[0] in ('desc', 'good', 'tip'):
            k, v = line.split(':', 1)
            cur_t[k] = [x.strip() for x in v.split('/')] if k == 'good' else v.strip()
        else:
            k, v = line.split(':', 1)
            meta[k.strip()] = v.strip()
    return meta, types, questions


def check(meta, types, questions):
    errs = []
    for k, t in types.items():
        for f in ('desc', 'good', 'tip'):
            if f not in t:
                errs.append(f'{k}: missing {f}')
        if t['match'] not in types or t['match'] == k:
            errs.append(f'{k}: bad match {t["match"]}')
    hits = {k: 0 for k in types}
    for i, q in enumerate(questions):
        if len(q['a']) != 4:
            errs.append(f'Q{i+1}: needs 4 options')
        for a in q['a']:
            for p in a['p']:
                if p not in types:
                    errs.append(f'Q{i+1}: unknown type {p}')
                else:
                    hits[p] += 1
    if errs:
        return errs, None
    # Each type must be reachable as a result and none should dominate random play.
    wins = {k: 0 for k in types}
    rnd = random.Random(1)
    for _ in range(20000):
        s = {k: 0 for k in types}
        last = []
        for q in questions:
            a = rnd.choice(q['a'])
            for p in a['p']:
                s[p] += 1
            last.append(a['p'])
        m = max(s.values())
        top = [k for k in types if s[k] == m]
        win = top[0]
        for ps in reversed(last):
            hit = next((p for p in ps if p in top), None)
            if hit and len(top) > 1:
                win = hit
                break
        wins[win] += 1
    share = {k: round(v / 200, 1) for k, v in wins.items()}
    for k, v in share.items():
        if v < 7 or v > 28:
            errs.append(f'{k}: random-play share {v}% out of range (hits {hits[k]})')
    return errs, share


def build():
    tpl = (SRC / 'template.html').read_text(encoding='utf-8')
    catalog, failed = [], False
    for path in sorted((SRC / 'data').glob('*.txt')):
        meta, types, questions = parse(path)
        errs, share = check(meta, types, questions)
        if errs:
            failed = True
            print(path.name, *errs, sep='\n  ')
            continue
        data = dict(id=meta['id'], title=meta['title'], types=types, questions=questions)
        js = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
        out = tpl
        for k in ('title', 'desc', 'lead', 'emoji', 'chip', 'accent', 'accent2', 'bg'):
            out = out.replace('{{' + k.upper() + '}}', html.escape(meta[k], quote=True))
        out = out.replace('{{DATA}}', js)
        assert '{{' not in out, path.name
        d = TOOLS / meta['id']
        d.mkdir(exist_ok=True)
        (d / 'index.html').write_text(out, encoding='utf-8')
        catalog.append(dict(order=int(meta['order']), id=meta['id'], title=meta['title'], emoji=meta['emoji'],
                            chip=meta['chip'], lead=meta['lead'], accent=meta['accent'], accent2=meta['accent2']))
        print(f"{meta['id']:<14} {len(questions)}問 {len(types)}タイプ  random-share {share}")
    catalog.sort(key=lambda c: c['order'])
    (SRC / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding='utf-8')
    e = lambda s: html.escape(s, quote=True)
    cards = '\n'.join(
        f'<a class="tc" href="./{c["id"]}/" style="--a:{e(c["accent"])};--a2:{e(c["accent2"])}">'
        f'<span class="te" aria-hidden="true">{e(c["emoji"])}</span>'
        f'<span class="tb"><span class="tg">{e(c["chip"])}</span><strong>{e(c["title"])}</strong>'
        f'<span class="tl">{e(c["lead"])}</span></span><span class="tar" aria-hidden="true">→</span></a>'
        for c in catalog)
    hub = (SRC / 'hub.html').read_text(encoding='utf-8').replace('{{COUNT}}', str(len(catalog))).replace('{{CARDS}}', cards)
    (TOOLS / 'index.html').write_text(hub, encoding='utf-8')
    return not failed and len(catalog) == 10


if __name__ == '__main__':
    sys.exit(0 if build() else 1)
