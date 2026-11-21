"""Generate the English pronunciation clips using Kokoro and store as MP3."""
import json, pathlib, subprocess, tempfile
import numpy as np
import soundfile as sf
from kokoro import KPipeline
import torch
torch.set_num_threads(2)
base = pathlib.Path(__file__).resolve().parent
words = json.loads((base / "audio-words.json").read_text(encoding="utf-8"))
out = base / "audio"
out.mkdir(exist_ok=True)
pipeline = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M", device="cpu")
for word in words:
    if not word.isalpha() or not word.isascii():
        raise ValueError(word)
    path = out / (word.lower() + ".mp3")
    if path.exists() and path.stat().st_size > 512:
        continue
    segments = [audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio) for _, _, audio in pipeline(word, voice="bf_emma", speed=0.95)]
    if not segments:
        raise RuntimeError("No audio for " + word)
    wave = np.concatenate(segments)
    if not np.isfinite(wave).all() or np.max(np.abs(wave)) < 0.01:
        raise RuntimeError("Invalid audio for " + word)
    wave = np.pad(wave, (2400, 3600))
    with tempfile.TemporaryDirectory() as temp:
        wav = pathlib.Path(temp) / "clip.wav"
        sf.write(wav, wave, 24000)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "64k", str(path)], check=True)
    print(word, path.stat().st_size, flush=True)
(out / "manifest.json").write_text(json.dumps({"engine":"Kokoro-82M","voice":"bf_emma","locale":"en-GB","words":words}, ensure_ascii=False), encoding="utf-8")
