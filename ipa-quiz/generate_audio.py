"""Generate natural, contextual British English word clips with safe silence boundaries."""
import json
import math
import pathlib
import subprocess
import numpy as np
import soundfile as sf
from kokoro import KPipeline
import torch

torch.set_num_threads(2)
SR = 24000
VOICE = "bf_emma"
SPEED = 1.0
base = pathlib.Path(__file__).resolve().parent
words = json.loads((base / "audio-words.json").read_text(encoding="utf-8"))
out = base / "audio-natural"
out.mkdir(exist_ok=True)
pipeline = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M", device="cpu")

# Explicit Kokoro phoneme input for the reported problem word.
overrides = {"lamb": "lˈam", "ram": "ɹˈam"}
previous = json.loads((base / "audio-clean" / "audit.json").read_text(encoding="utf-8"))["words"]

def db(value):
    return round(20 * math.log10(max(float(value), 1e-9)), 1)

def metrics(w):
    w = np.asarray(w, dtype=np.float64).reshape(-1)
    peak = np.max(np.abs(w))
    edge = min(int(SR * .06), len(w) // 4)
    return {
        "duration_s": round(len(w) / SR, 3),
        "peak_dbfs": db(peak),
        "leading_60ms_rms_dbfs": db(np.sqrt(np.mean(w[:edge] ** 2))),
        "trailing_60ms_rms_dbfs": db(np.sqrt(np.mean(w[-edge:] ** 2))),
        "clipped_samples": int(np.count_nonzero(np.abs(w) >= .999)),
    }

def old_metrics(path):
    if not path.exists():
        return None
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path),
                                   "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    return metrics(np.frombuffer(raw, dtype="<f4"))

def clean(w):
    y = np.asarray(w, dtype=np.float64).reshape(-1).copy()
    if not np.isfinite(y).all() or len(y) < SR * .12 or np.max(np.abs(y)) < .01:
        raise ValueError("Invalid model output")
    # Preserve the model's pitch, timing, dynamics and spectral envelope.
    y -= np.mean(y)
    peak = np.max(np.abs(y))
    if peak > .80:
        y *= .80 / peak
    fade = min(int(SR * .005), len(y)//4)
    ramp = np.linspace(0, 1, fade)
    y[:fade] *= ramp
    y[-fade:] *= ramp[::-1]
    return np.pad(y, (int(SR * .08), int(SR * .12)))

def quiet_cut(w, left, right):
    # A 20 ms low-energy window entirely inside the predicted interword pause.
    left = max(0, int(left))
    right = min(len(w), int(right))
    width = int(.020 * SR)
    hop = int(.005 * SR)
    if right - left < width:
        return None
    candidates = np.arange(left, right-width+1, hop)
    if not len(candidates):
        return None
    energy = np.array([np.sqrt(np.mean(w[k:k+width]**2)) for k in candidates])
    best = int(np.argmin(energy))
    # Reject ambiguous cuts rather than risk clipping a consonant or including
    # part of a neighbouring word.
    if energy[best] > max(.0005, .006 * np.max(np.abs(w))):
        return None
    return int(candidates[best]) + width//2

def generate_word(ps):
    # Kokoro's model card warns about short utterances. Give the model a longer
    # natural speaking context; isolate only a central complete repetition.
    sep = ". "
    n = min(21, max(9, math.ceil(100 / (len(ps) + len(sep)))))
    seq = sep.join([ps]*n) + "."
    if any(c not in pipeline.model.vocab for c in seq):
        raise ValueError(f"Unsupported phoneme token: {ps!r}")
    result = next(pipeline.generate_from_tokens(seq, voice=VOICE, speed=SPEED))
    w = result.audio.detach().cpu().numpy().reshape(-1)
    dur = result.pred_dur.detach().cpu().numpy().reshape(-1)
    if len(dur) == len(seq)+2 and dur.sum() > 0:
        timeline = np.rint(np.cumsum(np.r_[0, dur]) * len(w) / dur.sum()).astype(int)
        def pos(i):
            return timeline[i+1]  # offset for beginning-of-sequence token
        stride = len(ps)+len(sep)
        for k in sorted(range(2,n-2), key=lambda k: abs(k-n//2)):
            left = quiet_cut(w, pos((k-1)*stride+len(ps)), pos(k*stride))
            right = quiet_cut(w, pos(k*stride+len(ps)), pos((k+1)*stride))
            if left is None or right is None or right-left < SR*.12 or right-left > SR*3:
                continue
            sample = w[left:right]
            if np.max(np.abs(sample)) >= .01:
                return sample, "contextual"
    # A safe fallback retains the complete isolated expression, never a cut
    # through a phoneme. Still use normal speed and sentence-final punctuation.
    result = next(pipeline.generate_from_tokens(ps+".", voice=VOICE, speed=SPEED))
    return result.audio.detach().cpu().numpy().reshape(-1), "isolated-fallback"

report = {}
ordered = ["lamb", "ram"] + [w for w in words if w not in overrides]
for word in ordered:
    if not word.isalpha() or not word.isascii():
        raise ValueError(word)
    phonemes = overrides.get(word, previous[word]["phonemes"])
    raw, method = generate_word(phonemes)
    wave = clean(raw)
    dest = out / (word.lower() + ".wav")
    sf.write(dest, wave, SR, subtype="PCM_16")
    saved, sr = sf.read(dest)
    after = metrics(saved)
    if sr != SR or after["clipped_samples"] or after["leading_60ms_rms_dbfs"] > -80 or after["trailing_60ms_rms_dbfs"] > -80:
        raise RuntimeError(f"Output failed checks: {word}: {after}")
    report[word] = {"phonemes": phonemes, "generation_method": method, "old_mp3": old_metrics(base / "audio" / (word + ".mp3")), "new_wav": after}
    print(word, phonemes, method, after, flush=True)

assert set(report) == set(words)
(out / "manifest.json").write_text(json.dumps({"engine":"Kokoro-82M","voice":VOICE,"locale":"en-GB","format":"PCM16 WAV","sample_rate":SR,"speed":SPEED,"words":words}, ensure_ascii=False), encoding="utf-8")
(out / "audit.json").write_text(json.dumps({"checks":"Signal-level checks only, not human or phonetic certification","count":len(report),"contextual_count":sum(v["generation_method"]=="contextual" for v in report.values()),"words":report}, ensure_ascii=False, indent=2), encoding="utf-8")

# Switch the app only when every WAV and audit check has completed.
page = base / "index.html"
html = page.read_text(encoding="utf-8")
old_urls = "function clipURLs(word){const file=encodeURIComponent(word.toLowerCase())+'.wav';return [new URL('audio-clean/'+file,location.href).href,'https://raw.githubusercontent.com/kouheim1979/games/main/ipa-quiz/audio-clean/'+file]}"
new_urls = "function clipURLs(word){const file=encodeURIComponent(word.toLowerCase())+'.wav';return [new URL('audio-natural/'+file,location.href).href,'https://raw.githubusercontent.com/kouheim1979/games/main/ipa-quiz/audio-natural/'+file,new URL('audio-clean/'+file,location.href).href]}"
if old_urls in html:
    html = html.replace(old_urls, new_urls)
elif new_urls not in html:
    raise RuntimeError("Unexpected player code; do not publish partial update")
html = html.replace("v18</span>", "v19</span>").replace("レッスン v18</title>", "レッスン v19</title>")
page.write_text(html, encoding="utf-8")
