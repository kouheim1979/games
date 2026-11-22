"""Rebuild all pronunciation clips in lossless WAV and audit both generations."""
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
VOICE = "bf_isabella"
SPEED = 0.90
base = pathlib.Path(__file__).resolve().parent
words = json.loads((base / "audio-words.json").read_text(encoding="utf-8"))
out = base / "audio-clean"
out.mkdir(exist_ok=True)
pipeline = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M", device="cpu")

# Explicit Kokoro phoneme input for the reported problem word.
overrides = {"lamb": "læm", "ram": "ɹæm"}

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
    w = np.asarray(w, dtype=np.float64).reshape(-1)
    if not np.isfinite(w).all() or len(w) < SR * .12 or np.max(np.abs(w)) < .01:
        raise ValueError("Invalid model output")
    # Only remove DC offset/very low-frequency rumble. Do not use broadband
    # denoising, aggressive noise gates or cuts that would remove L/R or fricatives.
    alpha = math.exp(-2 * math.pi * 35 / SR)
    y = np.empty_like(w)
    y[0] = 0
    for i in range(1, len(w)):
        y[i] = alpha * (y[i-1] + w[i] - w[i-1])
    # Trim only surplus silence using 10ms RMS frames; retain 70ms of context.
    frame = SR // 100
    padded = np.pad(y, (0, (-len(y)) % frame))
    rms = np.sqrt(np.mean(padded.reshape(-1, frame)**2, axis=1))
    active = np.flatnonzero(rms > max(0.0007, float(rms.max()) * .004))
    if not len(active):
        raise ValueError("No voiced or unvoiced speech detected")
    lo = max(0, (int(active[0]) - 7) * frame)
    hi = min(len(y), (int(active[-1]) + 8) * frame)
    y = y[lo:hi].copy()
    # Smooth clip edges, not individual phonemes, and leave headroom.
    fade = min(int(SR * .008), len(y)//4)
    ramp = np.linspace(0, 1, fade)
    y[:fade] *= ramp
    y[-fade:] *= ramp[::-1]
    y *= .70 / np.max(np.abs(y))
    return np.pad(y, (int(SR * .10), int(SR * .15)))

report = {}
ordered = ["lamb", "ram"] + [w for w in words if w not in overrides]
for word in ordered:
    if not word.isalpha() or not word.isascii():
        raise ValueError(word)
    if word in overrides and hasattr(pipeline, "generate_from_tokens"):
        results = list(pipeline.generate_from_tokens(overrides[word], voice=VOICE, speed=SPEED))
    else:
        results = list(pipeline(word, voice=VOICE, speed=SPEED))
    phonemes = "".join(p for _, p, _ in results)
    if word in overrides and phonemes.strip("ˈˌ ") != overrides[word]:
        # Some British G2P implementations use 'r' for the approximant.
        if phonemes.strip("ˈˌ ").replace("r", "ɹ") != overrides[word]:
            raise RuntimeError(f"Unexpected phonemes for {word}: {phonemes!r}")
    segments = [a.detach().cpu().numpy() for _, _, a in results if a is not None]
    if not segments:
        raise RuntimeError("No audio for " + word)
    wave = clean(np.concatenate(segments))
    dest = out / (word.lower() + ".wav")
    sf.write(dest, wave, SR, subtype="PCM_16")
    saved, sr = sf.read(dest)
    after = metrics(saved)
    if sr != SR or after["clipped_samples"] or after["leading_60ms_rms_dbfs"] > -80 or after["trailing_60ms_rms_dbfs"] > -80:
        raise RuntimeError(f"Output failed checks: {word}: {after}")
    report[word] = {"phonemes": phonemes, "old_mp3": old_metrics(base / "audio" / (word + ".mp3")), "new_wav": after}
    print(word, phonemes, after, flush=True)

assert set(report) == set(words)
(out / "manifest.json").write_text(json.dumps({"engine":"Kokoro-82M","voice":VOICE,"locale":"en-GB","format":"PCM16 WAV","sample_rate":SR,"words":words}, ensure_ascii=False), encoding="utf-8")
(out / "audit.json").write_text(json.dumps({"checks":"Signal-level checks only, not human or phonetic certification","count":len(report),"words":report}, ensure_ascii=False, indent=2), encoding="utf-8")

# Switch the app only when every WAV and audit check has completed.
page = base / "index.html"
html = page.read_text(encoding="utf-8")
old_urls = "function clipURLs(word){const file=encodeURIComponent(word.toLowerCase())+'.mp3';return [new URL('audio/'+file+'?v=10',location.href).href,'https://raw.githubusercontent.com/kouheim1979/games/main/ipa-quiz/audio/'+file]}"
new_urls = "function clipURLs(word){const file=encodeURIComponent(word.toLowerCase())+'.wav';return [new URL('audio-clean/'+file,location.href).href,'https://raw.githubusercontent.com/kouheim1979/games/main/ipa-quiz/audio-clean/'+file]}"
if old_urls in html:
    html = html.replace(old_urls, new_urls)
elif new_urls not in html:
    raise RuntimeError("Unexpected player code; do not publish partial update")
html = html.replace("英国英語MP3音声", "英国英語WAV音声").replace("v17</span>", "v18</span>").replace("レッスン v17</title>", "レッスン v18</title>")
page.write_text(html, encoding="utf-8")
