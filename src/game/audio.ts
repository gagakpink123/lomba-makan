import { AUDIO_TRACKS, type AudioTrackKey } from './assets';
import { getLevelConfig, getSection2LevelConfig, getSectionForLevel } from './levels';

export interface AudioSettings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
}

class GameAudioController {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Dry / Cave-Wet routing for automatic cavernous echo during Lorong Gelap
  private masterLimiter: DynamicsCompressorNode | null = null;
  private musicDryGain: GainNode | null = null;
  private sfxDryGain: GainNode | null = null;
  private caveMusicWetGain: GainNode | null = null;
  private caveSfxWetGain: GainNode | null = null;
  private caveReturnGain: GainNode | null = null;
  private caveConvolver: ConvolverNode | null = null;
  private caveDelay: DelayNode | null = null;
  private caveDelayFeedback: GainNode | null = null;
  private caveAcousticsActive = false;

  private buffers = new Map<AudioTrackKey, AudioBuffer>();
  private rawBuffers = new Map<AudioTrackKey, ArrayBuffer>();
  private loadingPromises = new Map<AudioTrackKey, Promise<AudioBuffer | null>>();

  private activeBgmSource: AudioBufferSourceNode | null = null;
  private activeBgmGain: GainNode | null = null;
  private activeBgmKey: AudioTrackKey | null = null;
  private desiredBgmKey: AudioTrackKey | null = null;
  private bgmPaused = false;
  private bgmPauseOffset = 0;
  private bgmStartedAt = 0;

  private tunnelBgmActive = false;
  private tunnelBgmTimer: number | null = null;
  private tunnelBgmStep = 0;

  private lastSfxTime = new Map<AudioTrackKey, number>();

  private settings: AudioSettings = {
    musicVolume: 0.65,
    sfxVolume: 0.85,
    muted: false,
  };

  private buildCaveImpulseResponse(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const durationSec = 1.15;
    const length = Math.floor(sampleRate * durationSec);
    const ir = ctx.createBuffer(2, length, sampleRate);

    // Asymmetric early cave wall reflections (left/right staggered delays in seconds)
    const earlyL = [0.032, 0.068, 0.114, 0.168, 0.235];
    const earlyR = [0.044, 0.082, 0.132, 0.186, 0.258];

    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      const reflections = ch === 0 ? earlyL : earlyR;
      for (let idx = 0; idx < reflections.length; idx++) {
        const samplePos = Math.min(length - 1, Math.floor(reflections[idx] * sampleRate));
        const amp = 0.42 * Math.pow(0.72, idx);
        data[samplePos] += amp;
        if (samplePos + 1 < length) data[samplePos + 1] += amp * 0.5;
      }

      // Warm low-passed diffuse cavern tail
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.pow(1 - t / durationSec, 1.9) * Math.exp(-t * 2.15);
        const white = Math.random() * 2 - 1;
        lp = lp * 0.72 + white * 0.28;
        data[i] += lp * env * 0.26;
      }
    }
    return ir;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      this.musicGain = ctx.createGain();
      this.sfxGain = ctx.createGain();

      // Master limiter keeps stacked cave echoes punchy without clipping
      this.masterLimiter = ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-6, ctx.currentTime);
      this.masterLimiter.knee.setValueAtTime(12, ctx.currentTime);
      this.masterLimiter.ratio.setValueAtTime(6, ctx.currentTime);
      this.masterLimiter.attack.setValueAtTime(0.003, ctx.currentTime);
      this.masterLimiter.release.setValueAtTime(0.16, ctx.currentTime);
      this.masterLimiter.connect(ctx.destination);

      this.musicDryGain = ctx.createGain();
      this.sfxDryGain = ctx.createGain();
      this.caveMusicWetGain = ctx.createGain();
      this.caveSfxWetGain = ctx.createGain();
      this.caveReturnGain = ctx.createGain();
      this.caveReturnGain.gain.setValueAtTime(0.85, ctx.currentTime);

      // Cave Convolver (spacious cavern reverb) + Slapback Feedback Delay (distinct echo)
      this.caveConvolver = ctx.createConvolver();
      this.caveConvolver.buffer = this.buildCaveImpulseResponse(ctx);

      this.caveDelay = ctx.createDelay(1.0);
      this.caveDelay.delayTime.setValueAtTime(0.165, ctx.currentTime);
      this.caveDelayFeedback = ctx.createGain();
      this.caveDelayFeedback.gain.setValueAtTime(0.36, ctx.currentTime);
      const caveDelayFilter = ctx.createBiquadFilter();
      caveDelayFilter.type = 'lowpass';
      caveDelayFilter.frequency.setValueAtTime(2150, ctx.currentTime);

      // Dry connections
      this.musicGain.connect(this.musicDryGain);
      this.sfxGain.connect(this.sfxDryGain);
      this.musicDryGain.connect(this.masterLimiter);
      this.sfxDryGain.connect(this.masterLimiter);

      // Wet cave bus connections
      this.musicGain.connect(this.caveMusicWetGain);
      this.sfxGain.connect(this.caveSfxWetGain);

      this.caveMusicWetGain.connect(this.caveConvolver);
      this.caveSfxWetGain.connect(this.caveConvolver);
      this.caveConvolver.connect(this.caveReturnGain);

      this.caveMusicWetGain.connect(this.caveDelay);
      this.caveSfxWetGain.connect(this.caveDelay);
      this.caveDelay.connect(caveDelayFilter);
      caveDelayFilter.connect(this.caveReturnGain);
      caveDelayFilter.connect(this.caveDelayFeedback);
      this.caveDelayFeedback.connect(this.caveDelay);

      this.caveReturnGain.connect(this.masterLimiter);

      this.applyGains();
      this.applyCaveAcousticsGains();
    }
    return this.ctx;
  }

  public isCaveAcousticsActive(): boolean {
    return this.caveAcousticsActive;
  }

  public setCaveAcoustics(enabled: boolean): void {
    this.caveAcousticsActive = enabled;
    this.applyCaveAcousticsGains();
  }

  private applyCaveAcousticsGains(): void {
    if (
      !this.ctx ||
      !this.musicDryGain ||
      !this.sfxDryGain ||
      !this.caveMusicWetGain ||
      !this.caveSfxWetGain
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (this.caveAcousticsActive) {
      this.musicDryGain.gain.setTargetAtTime(0.88, now, 0.06);
      this.sfxDryGain.gain.setTargetAtTime(0.92, now, 0.04);
      this.caveMusicWetGain.gain.setTargetAtTime(0.62, now, 0.08);
      this.caveSfxWetGain.gain.setTargetAtTime(0.88, now, 0.04);
    } else {
      this.musicDryGain.gain.setTargetAtTime(1.0, now, 0.08);
      this.sfxDryGain.gain.setTargetAtTime(1.0, now, 0.06);
      this.caveMusicWetGain.gain.setTargetAtTime(0.0, now, 0.08);
      this.caveSfxWetGain.gain.setTargetAtTime(0.0, now, 0.06);
    }
  }

  public async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Autoplay policy will retry on next user gesture
      }
    }
    this.preloadAll();
    if (this.desiredBgmKey && !this.activeBgmSource && !this.bgmPaused && !this.tunnelBgmActive) {
      void this.startBgmKey(this.desiredBgmKey);
    }
  }

  public async preloadAssetBytes(
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    const keys = Object.keys(AUDIO_TRACKS) as AudioTrackKey[];
    const total = keys.length;
    let completed = 0;
    onProgress?.(0, total);

    await Promise.all(
      keys.map(async (key) => {
        if (!this.rawBuffers.has(key)) {
          try {
            const res = await fetch(AUDIO_TRACKS[key]);
            if (res.ok) {
              const arr = await res.arrayBuffer();
              this.rawBuffers.set(key, arr);
            }
          } catch {
            // Gracefully tolerate individual fetch failures on restricted networks
          }
        }
        completed += 1;
        onProgress?.(completed, total);
      }),
    );
  }

  public preloadAll(): void {
    const sfxKeys: AudioTrackKey[] = [
      'sfxButton',
      'sfxFoodCatch',
      'sfxWrongFood',
      'sfxLevelUp',
      'sfxGameOver',
      'sfxVictory',
      'sfxCountdown',
      'sfxLastChance',
    ];
    sfxKeys.forEach((key) => {
      void this.loadBuffer(key);
    });
  }

  private loadBuffer(key: AudioTrackKey): Promise<AudioBuffer | null> {
    const existing = this.buffers.get(key);
    if (existing) return Promise.resolve(existing);

    const inflight = this.loadingPromises.get(key);
    if (inflight) return inflight;

    const ctx = this.ensureContext();
    if (!ctx) return Promise.resolve(null);

    const cachedRaw = this.rawBuffers.get(key);
    const bytesPromise = cachedRaw
      ? Promise.resolve(cachedRaw.slice(0))
      : fetch(AUDIO_TRACKS[key]).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        });

    const promise = bytesPromise
      .then((arr) => {
        if (!this.rawBuffers.has(key)) {
          this.rawBuffers.set(key, arr.slice(0));
        }
        return ctx.decodeAudioData(arr);
      })
      .then((buf) => {
        this.buffers.set(key, buf);
        this.loadingPromises.delete(key);
        return buf;
      })
      .catch(() => {
        this.loadingPromises.delete(key);
        return null;
      });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  private applyGains(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const musicVal = this.settings.muted ? 0 : this.settings.musicVolume;
    const sfxVal = this.settings.muted ? 0 : this.settings.sfxVolume;
    this.musicGain.gain.setTargetAtTime(musicVal, now, 0.02);
    this.sfxGain.gain.setTargetAtTime(sfxVal, now, 0.02);
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public setMusicVolume(v: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, v));
    this.applyGains();
  }

  public setSfxVolume(v: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, v));
    this.applyGains();
  }

  public setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applyGains();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  public async playLevelBgm(level: number): Promise<void> {
    this.stopTunnelLoopOnly();
    this.tunnelBgmActive = false;
    this.setCaveAcoustics(false);
    const bgmKey =
      getSectionForLevel(level) === 2
        ? getSection2LevelConfig(level).bgmKey
        : getLevelConfig(level).bgmKey;
    this.desiredBgmKey = bgmKey;
    this.bgmPaused = false;
    this.bgmPauseOffset = 0;
    await this.startBgmKey(bgmKey);
  }

  private async startBgmKey(key: AudioTrackKey, offsetSeconds = 0): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }

    const buf = await this.loadBuffer(key);
    if (!buf || this.desiredBgmKey !== key || this.bgmPaused || this.tunnelBgmActive) return;

    // Fade out and stop previous BGM smoothly
    this.fadeOutActiveBgm(0.18);

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;

    const trackGain = ctx.createGain();
    const now = ctx.currentTime;
    trackGain.gain.setValueAtTime(0.001, now);
    trackGain.gain.linearRampToValueAtTime(1.0, now + 0.25);

    source.connect(trackGain);
    trackGain.connect(this.musicGain);

    const safeOffset = buf.duration > 0 ? offsetSeconds % buf.duration : 0;
    source.start(0, safeOffset);

    this.activeBgmSource = source;
    this.activeBgmGain = trackGain;
    this.activeBgmKey = key;
    this.bgmStartedAt = now - safeOffset;
  }

  private fadeOutActiveBgm(fadeSec = 0.2): void {
    const src = this.activeBgmSource;
    const g = this.activeBgmGain;
    const ctx = this.ctx;
    this.activeBgmSource = null;
    this.activeBgmGain = null;
    this.activeBgmKey = null;

    if (!src || !g || !ctx) return;
    const now = ctx.currentTime;
    try {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      src.stop(now + fadeSec + 0.02);
    } catch {
      try {
        src.stop();
      } catch {
        // Ignore already stopped source
      }
    }
  }

  public pauseBgm(): void {
    this.stopTunnelLoopOnly();
    if (this.bgmPaused) return;
    if (this.activeBgmSource && this.ctx) {
      const buf = this.activeBgmKey ? this.buffers.get(this.activeBgmKey) : undefined;
      const elapsed = this.ctx.currentTime - this.bgmStartedAt;
      this.bgmPauseOffset = buf && buf.duration > 0 ? elapsed % buf.duration : 0;
      this.fadeOutActiveBgm(0.1);
    }
    this.bgmPaused = true;
  }

  public async resumeBgm(): Promise<void> {
    if (!this.bgmPaused) return;
    this.bgmPaused = false;
    if (this.tunnelBgmActive) {
      this.setCaveAcoustics(true);
      this.startTunnelLoopOnly();
      return;
    }
    if (!this.desiredBgmKey) return;
    await this.startBgmKey(this.desiredBgmKey, this.bgmPauseOffset);
  }

  public stopBgm(preserveCaveAcoustics = false): void {
    this.tunnelBgmActive = false;
    this.stopTunnelLoopOnly();
    if (!preserveCaveAcoustics) {
      this.setCaveAcoustics(false);
    }
    this.desiredBgmKey = null;
    this.bgmPaused = false;
    this.bgmPauseOffset = 0;
    this.fadeOutActiveBgm(0.18);
  }

  public startTunnelSuspenseBgm(): void {
    if (this.tunnelBgmActive) return;
    this.tunnelBgmActive = true;
    this.setCaveAcoustics(true);

    // Pause upbeat level BGM while saving offset so it resumes seamlessly upon exit
    if (this.activeBgmSource && this.ctx) {
      const buf = this.activeBgmKey ? this.buffers.get(this.activeBgmKey) : undefined;
      const elapsed = this.ctx.currentTime - this.bgmStartedAt;
      this.bgmPauseOffset = buf && buf.duration > 0 ? elapsed % buf.duration : 0;
      this.fadeOutActiveBgm(0.24);
    }
    if (!this.bgmPaused) {
      this.startTunnelLoopOnly();
    }
  }

  public async stopTunnelSuspenseBgm(): Promise<void> {
    if (!this.tunnelBgmActive) return;
    this.tunnelBgmActive = false;
    this.stopTunnelLoopOnly();
    this.setCaveAcoustics(false);
    if (!this.bgmPaused && this.desiredBgmKey) {
      await this.startBgmKey(this.desiredBgmKey, this.bgmPauseOffset);
    }
  }

  private startTunnelLoopOnly(): void {
    if (this.tunnelBgmTimer || typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    // 16-step tense D-Phrygian / tritone cave suspense ostinato (~162 BPM)
    const bassPattern = [
      73.42, 73.42, 87.31, 73.42,
      103.83, 98.0, 87.31, 77.78,
      73.42, 73.42, 110.0, 103.83,
      87.31, 77.78, 69.3, 65.41,
    ];
    const eerieLeadNotes = [
      587.33, 0, 622.25, 0,
      554.37, 0, 698.46, 622.25,
      587.33, 0, 830.61, 0,
      783.99, 698.46, 622.25, 554.37,
    ];

    const triggerStep = () => {
      if (!this.tunnelBgmActive || this.bgmPaused || !this.ctx || !this.musicGain) return;
      if (this.settings.muted || this.settings.musicVolume <= 0.001) return;
      try {
        const c = this.ctx;
        const dest = this.musicGain;
        const now = c.currentTime;
        const step = this.tunnelBgmStep % 16;
        this.tunnelBgmStep += 1;

        // 1. Punchy dual-layer sub + mid-range resonant bass pulse (audible even on small speakers)
        const freq = bassPattern[step];
        const subOsc = c.createOscillator();
        const subGain = c.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(freq, now);
        subGain.gain.setValueAtTime(0.001, now);
        subGain.gain.linearRampToValueAtTime(0.36, now + 0.015);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        subOsc.connect(subGain);
        subGain.connect(dest);
        subOsc.start(now);
        subOsc.stop(now + 0.19);

        const gritOsc = c.createOscillator();
        const gritFilter = c.createBiquadFilter();
        const gritGain = c.createGain();
        gritOsc.type = 'sawtooth';
        gritOsc.frequency.setValueAtTime(freq * 2, now); // Octave harmonics cut clearly through mix
        gritFilter.type = 'lowpass';
        gritFilter.Q.setValueAtTime(3.6, now);
        gritFilter.frequency.setValueAtTime(980, now);
        gritFilter.frequency.exponentialRampToValueAtTime(280, now + 0.17);
        gritGain.gain.setValueAtTime(0.001, now);
        gritGain.gain.linearRampToValueAtTime(0.28, now + 0.012);
        gritGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        gritOsc.connect(gritFilter);
        gritFilter.connect(gritGain);
        gritGain.connect(dest);
        gritOsc.start(now);
        gritOsc.stop(now + 0.19);

        // 2. Heartbeat / Cavern Timpani Thump on strong beats + suspense double-pulse before turnaround
        if (step % 4 === 0 || step === 14 || step === 15) {
          const isDouble = step >= 14;
          const drumOsc = c.createOscillator();
          const drumGain = c.createGain();
          drumOsc.type = 'sine';
          drumOsc.frequency.setValueAtTime(isDouble ? 145 : 122, now);
          drumOsc.frequency.exponentialRampToValueAtTime(42, now + 0.15);
          drumGain.gain.setValueAtTime(0.001, now);
          drumGain.gain.linearRampToValueAtTime(isDouble ? 0.34 : 0.42, now + 0.008);
          drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
          drumOsc.connect(drumGain);
          drumGain.connect(dest);
          drumOsc.start(now);
          drumOsc.stop(now + 0.18);
        }

        // 3. Sustained Ominous Minor/Tritone Cave Pad every 8 steps (fills atmosphere seamlessly)
        if (step % 8 === 0) {
          const chordNotes = step === 0 ? [146.83, 174.61, 207.65] : [146.83, 164.81, 220.0];
          const padFilter = c.createBiquadFilter();
          padFilter.type = 'bandpass';
          padFilter.Q.setValueAtTime(1.4, now);
          padFilter.frequency.setValueAtTime(340, now);
          padFilter.frequency.linearRampToValueAtTime(640, now + 0.72);
          padFilter.frequency.linearRampToValueAtTime(310, now + 1.45);
          const padGain = c.createGain();
          padGain.gain.setValueAtTime(0.001, now);
          padGain.gain.linearRampToValueAtTime(0.16, now + 0.25);
          padGain.gain.linearRampToValueAtTime(0.001, now + 1.48);
          padFilter.connect(padGain);
          padGain.connect(dest);

          for (const noteFreq of chordNotes) {
            const pOsc = c.createOscillator();
            pOsc.type = 'sawtooth';
            pOsc.frequency.setValueAtTime(noteFreq, now);
            pOsc.connect(padFilter);
            pOsc.start(now);
            pOsc.stop(now + 1.5);
          }
        }

        // 4. Eerie Echoing High Suspense Pluck / Stalactite Bell
        const leadFreq = eerieLeadNotes[step];
        if (leadFreq > 0) {
          const leadOsc = c.createOscillator();
          const leadOsc2 = c.createOscillator();
          const leadGain = c.createGain();
          leadOsc.type = 'triangle';
          leadOsc2.type = 'sine';
          leadOsc.frequency.setValueAtTime(leadFreq, now);
          leadOsc2.frequency.setValueAtTime(leadFreq * 1.006, now); // Slight detune for eerie chill
          leadGain.gain.setValueAtTime(0.001, now);
          leadGain.gain.linearRampToValueAtTime(0.22, now + 0.01);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          leadOsc.connect(leadGain);
          leadOsc2.connect(leadGain);
          leadGain.connect(dest);
          leadOsc.start(now);
          leadOsc2.start(now);
          leadOsc.stop(now + 0.29);
          leadOsc2.stop(now + 0.29);
        }
      } catch {
        // Ignore oscillator errors when audio context is locked
      }
    };

    triggerStep();
    this.tunnelBgmTimer = window.setInterval(triggerStep, 185);
  }

  private stopTunnelLoopOnly(): void {
    if (this.tunnelBgmTimer) {
      clearInterval(this.tunnelBgmTimer);
      this.tunnelBgmTimer = null;
    }
  }

  public playSfx(key: AudioTrackKey, minIntervalMs = 55): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.001) return;

    const nowMs = performance.now();
    const prevMs = this.lastSfxTime.get(key) ?? 0;
    if (nowMs - prevMs < minIntervalMs) return;
    this.lastSfxTime.set(key, nowMs);

    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const playbackRate =
      key === 'sfxFoodCatch' ? 0.94 + Math.random() * 0.14 : 1;

    const buf = this.buffers.get(key);
    if (!buf) {
      void this.loadBuffer(key).then((loaded) => {
        if (loaded && !this.settings.muted) {
          this.triggerBufferSfx(loaded, playbackRate);
        }
      });
    } else {
      this.triggerBufferSfx(buf, playbackRate);
    }

    if (key === 'sfxButton') {
      this.playToyAccent('pop');
    } else if (key === 'sfxFoodCatch') {
      this.playToyAccent('sparkle');
    }
  }

  public playMysteryChime(isFood: boolean): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    this.playToyAccent(isFood ? 'mysteryGood' : 'mysteryZonk');
  }

  public playSebelPop(): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.001) return;
    const nowMs = performance.now();
    const prevMs = this.lastSfxTime.get('sfxButton') ?? 0;
    if (nowMs - prevMs < 180) return;
    this.lastSfxTime.set('sfxButton', nowMs);

    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    this.playToyAccent('sebel');
  }

  /**
   * Plays an unmistakable elastic cartoon "TUINGGG!!" spring-swell SFX synced to 3x inflation.
   */
  public playTuingSfx(delaySec = 0): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.001) return;
    const ctx = this.ensureContext();
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    try {
      const start = ctx.currentTime + Math.max(0, delaySec);
      const duration = 0.58;

      // Primary spring carrier (rapid inflation pitch rise -> rubbery wobbling resonance)
      const mainOsc = ctx.createOscillator();
      const harmOsc = ctx.createOscillator();
      const harmFilter = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoDepth = ctx.createGain();
      const envGain = ctx.createGain();

      mainOsc.type = 'triangle';
      mainOsc.frequency.setValueAtTime(145, start);
      mainOsc.frequency.exponentialRampToValueAtTime(560, start + 0.075);
      mainOsc.frequency.exponentialRampToValueAtTime(340, start + duration);

      // Harmonic snap voice tracks an octave above for crisp mobile/laptop clarity
      harmOsc.type = 'sawtooth';
      harmOsc.frequency.setValueAtTime(290, start);
      harmOsc.frequency.exponentialRampToValueAtTime(1120, start + 0.075);
      harmOsc.frequency.exponentialRampToValueAtTime(680, start + duration);
      harmFilter.type = 'lowpass';
      harmFilter.frequency.setValueAtTime(1850, start);
      harmFilter.frequency.exponentialRampToValueAtTime(820, start + duration);

      // Vibrato spring wobble ("tui-ui-ui-uing")
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(18.5, start);
      lfoDepth.gain.setValueAtTime(0, start);
      lfoDepth.gain.linearRampToValueAtTime(92, start + 0.08);
      lfoDepth.gain.linearRampToValueAtTime(24, start + duration);

      lfo.connect(lfoDepth);
      lfoDepth.connect(mainOsc.frequency);
      lfoDepth.connect(harmOsc.frequency);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.42, start);

      envGain.gain.setValueAtTime(0.001, start);
      envGain.gain.linearRampToValueAtTime(0.56, start + 0.025);
      envGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      mainOsc.connect(envGain);
      harmOsc.connect(harmFilter);
      harmFilter.connect(harmGain);
      harmGain.connect(envGain);
      envGain.connect(dest);

      mainOsc.start(start);
      harmOsc.start(start);
      lfo.start(start);
      mainOsc.stop(start + duration + 0.02);
      harmOsc.stop(start + duration + 0.02);
      lfo.stop(start + duration + 0.02);
    } catch {
      // Ignore oscillator errors when audio context is locked
    }
  }

  /**
   * Plays heavy stone/metal impact crunch + clang followed immediately by the elastic "TUING!!" swell.
   */
  public playCrashSfx(): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.001) return;
    const ctx = this.ensureContext();
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    try {
      const now = ctx.currentTime;

      // 1. Heavy low-end impact punch ("DUK!")
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sawtooth';
      thud.frequency.setValueAtTime(215, now);
      thud.frequency.exponentialRampToValueAtTime(38, now + 0.25);
      thudGain.gain.setValueAtTime(0.001, now);
      thudGain.gain.linearRampToValueAtTime(0.58, now + 0.012);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
      thud.connect(thudGain);
      thudGain.connect(dest);
      thud.start(now);
      thud.stop(now + 0.28);

      // 2. Rock/iron collision noise crunch ("BRAK!")
      const noiseLen = Math.floor(ctx.sampleRate * 0.24);
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp((-i / noiseLen) * 4.5);
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.setValueAtTime(1.1, now);
      noiseFilter.frequency.setValueAtTime(920, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(220, now + 0.22);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.54, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.24);

      // 3. Metallic clang overtone (rings cleanly into cave echo!)
      for (const clangFreq of [318, 492]) {
        const clangOsc = ctx.createOscillator();
        const clangGain = ctx.createGain();
        clangOsc.type = 'square';
        clangOsc.frequency.setValueAtTime(clangFreq, now);
        clangOsc.frequency.exponentialRampToValueAtTime(clangFreq * 0.84, now + 0.2);
        clangGain.gain.setValueAtTime(0.001, now);
        clangGain.gain.linearRampToValueAtTime(0.2, now + 0.006);
        clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        clangOsc.connect(clangGain);
        clangGain.connect(dest);
        clangOsc.start(now);
        clangOsc.stop(now + 0.23);
      }

      // 4. Synced elastic "TUINGGG!!" character enlargement bounce right after impact
      this.playTuingSfx(0.045);
    } catch {
      // Ignore oscillator errors when audio context is locked
    }
  }

  public playPlaneFlyby(): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.001) return;
    const ctx = this.ensureContext();
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    try {
      const duration = 4.4;
      const now = ctx.currentTime;

      // Soft pink-ish filtered noise for distant airplane air rush
      const sampleCount = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < sampleCount; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        data[i] = (b0 + b1 + b2 + white * 0.06) * 0.55;
      }

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.Q.setValueAtTime(1.4, now);
      bandpass.frequency.setValueAtTime(240, now);
      bandpass.frequency.exponentialRampToValueAtTime(680, now + duration * 0.45);
      bandpass.frequency.exponentialRampToValueAtTime(210, now + duration);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.18, now + duration * 0.42);
      noiseGain.gain.linearRampToValueAtTime(0.0001, now + duration);

      noiseSrc.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(dest);
      noiseSrc.start(now);
      noiseSrc.stop(now + duration);

      // Gentle Doppler hum for airplane-passing feel
      const engineOsc = ctx.createOscillator();
      const engineFilter = ctx.createBiquadFilter();
      const engineGain = ctx.createGain();
      engineOsc.type = 'triangle';
      engineOsc.frequency.setValueAtTime(138, now);
      engineOsc.frequency.linearRampToValueAtTime(126, now + duration * 0.45);
      engineOsc.frequency.linearRampToValueAtTime(88, now + duration);

      engineFilter.type = 'lowpass';
      engineFilter.frequency.setValueAtTime(320, now);

      engineGain.gain.setValueAtTime(0.0001, now);
      engineGain.gain.linearRampToValueAtTime(0.08, now + duration * 0.42);
      engineGain.gain.linearRampToValueAtTime(0.0001, now + duration);

      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(dest);
      engineOsc.start(now);
      engineOsc.stop(now + duration + 0.04);
    } catch {
      // Ignore oscillator errors when audio context is locked
    }
  }

  private playToyAccent(
    kind: 'pop' | 'sparkle' | 'mysteryGood' | 'mysteryZonk' | 'sebel',
  ): void {
    const ctx = this.ctx;
    const dest = this.sfxGain;
    if (!ctx || !dest) return;

    try {
      const now = ctx.currentTime;
      if (kind === 'pop') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(860, now + 0.055);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.11, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
        osc.connect(g);
        g.connect(dest);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (kind === 'sparkle') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        const base = 740 + Math.random() * 140;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 1.48, now + 0.09);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.09, now + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(g);
        g.connect(dest);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (kind === 'mysteryGood') {
        const notes = [659.25, 880, 1174.66];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const t = now + idx * 0.045;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.001, t);
          g.gain.linearRampToValueAtTime(0.13, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          osc.connect(g);
          g.connect(dest);
          osc.start(t);
          osc.stop(t + 0.19);
        });
      } else if (kind === 'sebel') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.09, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(g);
        g.connect(dest);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.09, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(g);
        g.connect(dest);
        osc.start(now);
        osc.stop(now + 0.21);
      }
    } catch {
      // Ignore oscillator errors when audio context is locked
    }
  }

  private triggerBufferSfx(buf: AudioBuffer, playbackRate = 1): void {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = playbackRate;
      src.connect(this.sfxGain);
      src.start(0);
    } catch {
      // Ignore playback errors when context is locked
    }
  }
}

export const audioManager = new GameAudioController();
