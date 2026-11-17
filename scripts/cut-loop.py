"""Cut an exact loop of whole bars out of a beat, for the app's built-in beats.

Finds the tempo precisely (to a hundredth of a BPM) and where the beats fall,
picks the downbeat as the beat where the kick is strongest, then cuts
`--bars` bars starting at the first downbeat after `--from` seconds. A little
real audio is kept before bar 1 (pre-roll) so the app can fade loop seams.
The app reads the tempo, the pre-roll and the bar count from the output.

Needs ffmpeg and numpy.
  python scripts/cut-loop.py <input> <output.mp3> [--bpm 90] [--from 30] [--bars 16] [--shift 0]
--bpm is a starting guess (default: search 70 to 160); --shift moves bar 1 by whole beats.
"""
import argparse, json, subprocess
import numpy as np

SR = 22050
HOP = 64
PREROLL = 0.25
POSTROLL = 0.15

def decode(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def bands(x):
    """Rise in energy per frame, for the low band (kick) and everything."""
    n = 1024
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::HOP] * np.hanning(n)
    spec = np.abs(np.fft.rfft(frames, axis=1))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    logspec = np.log1p(spec * 10)
    rise = np.maximum(0, np.diff(logspec, axis=0))
    full = rise.sum(axis=1)
    low = rise[:, freqs < 150].sum(axis=1)
    full = np.maximum(0, full - np.convolve(full, np.ones(32) / 32, mode="same"))
    return full, low

def grid_score(env, period, phase, fps):
    t = np.arange(phase, len(env) / fps - 0.05, period)
    f = t * fps
    i = np.floor(f).astype(int)
    vals = np.maximum.reduce([env[np.clip(i + d, 0, len(env) - 1)] for d in (-1, 0, 1, 2)])
    return vals.mean()

def best_phase(env, period, fps):
    phases = np.arange(0, period, 1 / fps)
    scores = [grid_score(env, period, p, fps) for p in phases]
    return phases[int(np.argmax(scores))], max(scores)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input"); ap.add_argument("output")
    ap.add_argument("--bpm", type=float); ap.add_argument("--from", dest="start", type=float)
    ap.add_argument("--bars", type=int, default=16); ap.add_argument("--shift", type=int, default=0)
    a = ap.parse_args()
    x = decode(a.input)
    fps = SR / HOP
    full, low = bands(x)
    lo, hi = (a.bpm - 1.5, a.bpm + 1.5) if a.bpm else (70, 160)
    coarse = max(np.arange(lo, hi, 0.25), key=lambda b: best_phase(full, 60 / b, fps)[1])
    fine = max(np.arange(coarse - 0.3, coarse + 0.3, 0.01), key=lambda b: best_phase(full, 60 / b, fps)[1])
    bpm = round(fine) if best_phase(full, 60 / round(fine), fps)[1] >= best_phase(full, 60 / fine, fps)[1] * 0.995 else round(fine, 2)
    period = 60 / bpm
    phase, _ = best_phase(full, period, fps)
    # Downbeat: the beat in the bar with the strongest kicks over the whole track.
    beats = np.arange(phase, len(full) / fps - 0.05, period)
    kick = [low[min(len(low) - 1, int(t * fps)) : min(len(low), int(t * fps) + 3)].max(initial=0) for t in beats]
    totals = [np.mean(kick[k::4]) for k in range(4)]
    down = (int(np.argmax(totals)) + a.shift) % 4
    first_bar = phase + down * period
    duration = len(x) / SR
    start_from = a.start if a.start is not None else duration * 0.25
    bar = 4 * period
    k = max(0, int(np.ceil((start_from - first_bar) / bar)))
    bar1 = first_bar + k * bar
    length = a.bars * bar
    if bar1 + length + POSTROLL > duration:
        raise SystemExit(f"Not enough audio for {a.bars} bars after {start_from:.1f}s")
    cut_from = bar1 - PREROLL
    subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-i", a.input, "-ss", f"{cut_from:.6f}", "-t", f"{PREROLL + length + POSTROLL:.6f}",
                    "-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k", a.output], check=True)
    info = {"bpm": bpm, "start": PREROLL, "bars": a.bars, "cutAt": round(cut_from, 3), "downbeatShift": down, "kickByBeat": [round(float(t), 3) for t in totals]}
    print(json.dumps(info))

main()
