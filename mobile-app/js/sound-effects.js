/**
 * SPARKX Audio Feedback System (Synthesized Web Audio)
 * Provides calming, non-punitive audio cues for focus intervals,
 * breath cycles, gentle toasts, and completion celebrations.
 */

class SoundEffectsController {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
  }

  _initContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Soft high-frequency chime for Level 1 Toast
  playGentleNudge() {
    if (!this.soundEnabled) return;
    try {
      this._initContext();
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio playback not permitted yet:', e);
    }
  }

  // Harmonic tone for Level 2 Dim & Breathe Inhale/Exhale
  playBreathingChime(isInhaling = true) {
    if (!this.soundEnabled) return;
    try {
      this._initContext();
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      const targetFreq = isInhaling ? 329.63 : 261.63; // E4 or C4
      osc.frequency.setValueAtTime(targetFreq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 2.0);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Level 3 Warning Tone
  playEscalationAlert() {
    if (!this.soundEnabled) return;
    try {
      this._initContext();
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(392, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Celebratory triad chord for session completion
  playSessionCompleted() {
    if (!this.soundEnabled) return;
    try {
      this._initContext();
      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.8);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.8);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }
}

window.soundController = new SoundEffectsController();
