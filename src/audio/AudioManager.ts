import { bus, GameEvent } from '@/core/EventBus';
import { Profile } from '@/managers/ProfileStore';

/**
 * Lightweight synthesized audio. We ship no audio files: every cue is generated
 * with the WebAudio API on demand. This fulfills the "audio hooks" design goal
 * (engine, coins, delivery, UI, siren, nitro, near-miss...) and can later be
 * swapped for sampled assets behind the same event-driven interface.
 */
export type SfxId =
  | 'ui_click'
  | 'ui_back'
  | 'coin'
  | 'deliver'
  | 'pickup'
  | 'crash'
  | 'near_miss'
  | 'combo'
  | 'countdown'
  | 'go'
  | 'nitro'
  | 'fail'
  | 'levelup';

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private started = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  init(): void {
    bus.on(GameEvent.Sfx, (id: SfxId) => this.play(id));
    // Resume audio on first user gesture (mobile autoplay policy).
    const resume = () => this.ensure();
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
  }

  private ensure(): void {
    if (this.started) {
      void this.ctx?.resume();
      return;
    }
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.started = true;
    } catch {
      /* audio unavailable */
    }
  }

  private get soundOn(): boolean {
    return Profile.get().settings.sound;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'sine',
    vol = 0.3,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  play(id: SfxId): void {
    this.ensure();
    if (!this.soundOn || !this.ctx) return;
    switch (id) {
      case 'ui_click':
        this.tone(520, 0.08, 'triangle', 0.18);
        break;
      case 'ui_back':
        this.tone(320, 0.08, 'triangle', 0.16);
        break;
      case 'coin':
        this.tone(880, 0.06, 'square', 0.14);
        this.tone(1320, 0.09, 'square', 0.1);
        break;
      case 'pickup':
        this.tone(440, 0.1, 'sine', 0.22, 660);
        break;
      case 'deliver':
        this.tone(660, 0.12, 'sine', 0.25);
        this.tone(990, 0.16, 'sine', 0.2);
        this.tone(1320, 0.2, 'sine', 0.15);
        break;
      case 'combo':
        this.tone(720, 0.08, 'square', 0.16, 1080);
        break;
      case 'crash':
        this.noise(0.25, 0.35);
        this.tone(120, 0.25, 'sawtooth', 0.25, 60);
        break;
      case 'near_miss':
        this.tone(1400, 0.05, 'sine', 0.1, 900);
        break;
      case 'countdown':
        this.tone(440, 0.1, 'triangle', 0.2);
        break;
      case 'go':
        this.tone(660, 0.25, 'triangle', 0.28, 990);
        break;
      case 'nitro':
        this.tone(200, 0.3, 'sawtooth', 0.18, 800);
        break;
      case 'fail':
        this.tone(330, 0.3, 'sawtooth', 0.24, 120);
        break;
      case 'levelup':
        [523, 659, 784, 1047].forEach((f, i) =>
          setTimeout(() => this.tone(f, 0.14, 'triangle', 0.2), i * 90),
        );
        break;
    }
  }

  /** Continuous engine hum whose pitch tracks speed 0..1. */
  startEngine(): void {
    this.ensure();
    if (!this.ctx || !this.master || this.engineOsc || !this.soundOn) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 70;
    this.engineGain.gain.value = 0.03;
    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  setEngineIntensity(t: number): void {
    if (!this.engineOsc || !this.ctx) return;
    this.engineOsc.frequency.setTargetAtTime(60 + t * 130, this.ctx.currentTime, 0.1);
  }

  stopEngine(): void {
    try {
      this.engineOsc?.stop();
    } catch {
      /* already stopped */
    }
    this.engineOsc = null;
    this.engineGain = null;
  }
}

export const Audio = new AudioManagerImpl();

/** Fire a one-shot sound via the event bus (decoupled from AudioManager). */
export function sfx(id: SfxId): void {
  bus.emit(GameEvent.Sfx, id);
}
