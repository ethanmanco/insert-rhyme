import * as Tone from "tone";

/**
 * Records your voice, mixed with the beat, into one file that never leaves
 * the device. The beat is taken straight from the mix before the speakers,
 * so it is clean even through headphones, and it is delayed by the time
 * sound takes to reach you and your voice takes to come back, so the two
 * line up the way you heard them.
 */

export interface Take {
  url: string;
  blob: Blob;
  extension: string;
  seconds: number;
}

const TYPES: [string, string][] = [
  ["audio/webm;codecs=opus", "webm"],
  ["audio/mp4", "m4a"],
  ["audio/ogg;codecs=opus", "ogg"],
  ["audio/webm", "webm"],
];

type SessionNavigator = Navigator & { audioSession?: { type: string } };

function setSession(type: string) {
  try {
    const nav = navigator as SessionNavigator;
    if (nav.audioSession) nav.audioSession.type = type;
  } catch {
    // Not supported here.
  }
}

export function canRecord(): boolean {
  return typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export class Recorder {
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private dest?: MediaStreamAudioDestinationNode;
  private nodes: AudioNode[] = [];
  private chunks: Blob[] = [];
  private startedAt = 0;
  private extension = "webm";
  /** The node the beat feeds, so it can be unhooked after the take. */
  private beatInput?: AudioNode;
  recording = false;

  /** Ask for the microphone (the browser shows its own prompt the first time). */
  async open(): Promise<void> {
    if (this.stream) return;
    // Let the browser pick a record-friendly audio route while the mic is on.
    setSession("auto");
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
    });
  }

  /** Start a take. `beat` is the mix to record under the voice, or null for voice only. */
  start(beat: Tone.ToneAudioNode | null): void {
    if (!this.stream || this.recording) return;
    const raw = Tone.getContext().rawContext as AudioContext;
    this.dest = raw.createMediaStreamDestination();
    const mic = raw.createMediaStreamSource(this.stream);
    mic.connect(this.dest);
    this.nodes = [mic];
    if (beat) {
      const settings = (this.stream.getAudioTracks()[0]?.getSettings() ?? {}) as MediaTrackSettings & { latency?: number };
      const inputLatency = Number(settings.latency ?? 0) || 0;
      const lag = (raw.baseLatency || 0) + (raw.outputLatency || 0) + inputLatency;
      const delay = raw.createDelay(1);
      delay.delayTime.value = Math.min(0.9, lag);
      const level = raw.createGain();
      level.gain.value = 0.7;
      Tone.connect(beat, delay);
      delay.connect(level).connect(this.dest);
      this.nodes.push(delay, level);
      this.beatInput = delay;
    }
    const [mimeType, extension] = TYPES.find(([t]) => MediaRecorder.isTypeSupported(t)) ?? ["", "webm"];
    this.recorder = new MediaRecorder(this.dest.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start(250);
    this.extension = extension;
    this.startedAt = performance.now();
    this.recording = true;
  }

  elapsed(): number {
    return this.recording ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  /** Finish the take and hand it back. */
  stop(beat: Tone.ToneAudioNode | null): Promise<Take | null> {
    const rec = this.recorder;
    if (!rec || !this.recording) return Promise.resolve(null);
    this.recording = false;
    const seconds = (performance.now() - this.startedAt) / 1000;
    return new Promise((resolve) => {
      rec.addEventListener(
        "stop",
        () => {
          const type = rec.mimeType || "audio/webm";
          const blob = new Blob(this.chunks, { type });
          this.chunks = [];
          if (beat && this.beatInput) {
            try {
              Tone.disconnect(beat, this.beatInput);
            } catch {
              // Already disconnected.
            }
          }
          this.beatInput = undefined;
          this.nodes.forEach((n) => n.disconnect());
          this.nodes = [];
          resolve(blob.size ? { blob, url: URL.createObjectURL(blob), extension: this.extension, seconds } : null);
        },
        { once: true },
      );
      rec.stop();
    });
  }

  /** Let go of the microphone so the browser's recording light goes off. */
  close(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    setSession("playback");
  }
}
