import { bus, GameEvent } from '@/core/EventBus';
import { Steer } from '@/types';

/**
 * The control scheme as native HTML buttons layered over the 3D canvas (in #ui):
 * ‹  ▲(GAS)  ›. Hold the center pedal to accelerate, release to coast/brake; tap
 * the sides to steer (buffered to the next intersection). DOM buttons mean pixel-
 * perfect touch hit-testing — no canvas coordinate math, no offset bugs. Keyboard
 * mirrors it for desktop.
 */
export class ControlPadHtml {
  private readonly root: HTMLElement;
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;

  constructor(parent: HTMLElement) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.className = 'dr-pad';
    this.root.innerHTML = `
      <button class="dr-btn dr-left" aria-label="Left">‹</button>
      <button class="dr-btn dr-gas" aria-label="Gas">▲</button>
      <button class="dr-btn dr-right" aria-label="Right">›</button>`;
    parent.appendChild(this.root);

    const left = this.root.querySelector('.dr-left') as HTMLElement;
    const gas = this.root.querySelector('.dr-gas') as HTMLElement;
    const right = this.root.querySelector('.dr-right') as HTMLElement;

    // All three are HELD: steer while pressed (release → straight), gas while pressed.
    hold(
      left,
      () => bus.emit(GameEvent.ControlSteer, Steer.Left),
      () => bus.emit(GameEvent.ControlSteer, Steer.Straight),
    );
    hold(
      right,
      () => bus.emit(GameEvent.ControlSteer, Steer.Right),
      () => bus.emit(GameEvent.ControlSteer, Steer.Straight),
    );
    hold(
      gas,
      () => bus.emit(GameEvent.ControlThrottle, true),
      () => bus.emit(GameEvent.ControlThrottle, false),
    );

    // Keyboard (desktop): hold arrows/WASD to steer, up/W/space to accelerate.
    this.onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') bus.emit(GameEvent.ControlSteer, Steer.Left);
      else if (e.key === 'ArrowRight' || e.key === 'd') bus.emit(GameEvent.ControlSteer, Steer.Right);
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') bus.emit(GameEvent.ControlThrottle, true);
    };
    this.onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') {
        bus.emit(GameEvent.ControlSteer, Steer.Straight);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
        bus.emit(GameEvent.ControlThrottle, false);
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.root.remove();
  }
}

/** Held button (steer while pressed, or gas pedal). */
function hold(el: HTMLElement, onDown: () => void, onUp: () => void): void {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.classList.add('is-down');
    onDown();
  });
  const up = (e: Event) => {
    e.preventDefault();
    el.classList.remove('is-down');
    onUp();
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
    .dr-pad {
      position: fixed; left: 0; right: 0;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
      display: flex; justify-content: center; align-items: flex-end; gap: 14px;
      padding: 0 16px; z-index: 6; touch-action: none; user-select: none;
    }
    .dr-btn {
      border: none; outline: none; color: #fff; font-weight: 900;
      font-family: system-ui, sans-serif; border-radius: 22px;
      box-shadow: 0 6px 0 rgba(0,0,0,0.35), 0 8px 18px rgba(0,0,0,0.35);
      transition: transform .05s ease, box-shadow .05s ease; touch-action: none; pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    }
    .dr-btn.is-down { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,0.35); }
    .dr-left  { width: clamp(64px, 18vw, 92px); height: clamp(64px, 18vw, 92px);
      font-size: clamp(28px, 8vw, 40px); background: linear-gradient(#3b82f6,#2f6ad0); }
    .dr-right { width: clamp(64px, 18vw, 92px); height: clamp(64px, 18vw, 92px);
      font-size: clamp(28px, 8vw, 40px); background: linear-gradient(#f5a524,#d98410); }
    .dr-gas   { width: clamp(84px, 22vw, 120px); height: clamp(84px, 22vw, 120px);
      font-size: clamp(34px, 9vw, 46px); background: linear-gradient(#37d67a,#22a058); }
  `;
  document.head.appendChild(s);
}
