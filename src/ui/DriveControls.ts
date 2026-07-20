import { bus, GameEvent } from '@/core/EventBus';

/**
 * Phone-first driving controls: a draggable analog **steering wheel** (bottom-left)
 * and a hold **gas pedal** (bottom-right), with a smaller **reverse ("GERİ")
 * button** stacked above it. Dragging the wheel left/right steers proportionally
 * (grab anywhere, relative drag → smooth, precise corrections that tap-arrows
 * can't give); releasing recentres. The pedal accelerates while held; reverse
 * backs up while held (braking through 0 first if still rolling forward).
 * Native DOM + pointer capture = reliable touch with no canvas math. Keyboard
 * (A/D or ←/→ to steer, W/↑/Space for gas, S/↓/R for reverse) mirrors it for desktop.
 */
export class DriveControls {
  private readonly root: HTMLElement;
  private readonly face: HTMLElement;
  private axis = 0;
  private dragId = -1;
  private startX = 0;
  /** Horizontal px of drag for full lock. */
  private readonly range = 82;
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;
  private keyAxis = 0;

  constructor(parent: HTMLElement) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.className = 'dr-drive';
    this.root.innerHTML = `
      <div class="dr-wheel" aria-label="Steering wheel">
        <div class="dr-wheel-face">
          <div class="dr-spoke dr-spoke-h"></div>
          <div class="dr-spoke dr-spoke-v"></div>
          <div class="dr-hub"></div>
          <div class="dr-mark"></div>
        </div>
      </div>
      <div class="dr-pedal-group">
        <button class="dr-reverse" aria-label="Reverse">
          <span class="dr-reverse-arrow">▼</span>
          <span class="dr-reverse-label">GERİ</span>
        </button>
        <button class="dr-pedal" aria-label="Gas pedal">
          <span class="dr-pedal-arrow">▲</span>
          <span class="dr-pedal-label">GAZ</span>
        </button>
      </div>`;
    parent.appendChild(this.root);

    const wheel = this.root.querySelector('.dr-wheel') as HTMLElement;
    this.face = this.root.querySelector('.dr-wheel-face') as HTMLElement;
    const pedal = this.root.querySelector('.dr-pedal') as HTMLElement;
    const reverse = this.root.querySelector('.dr-reverse') as HTMLElement;

    // --- Steering wheel: relative horizontal drag → analog axis --------------
    wheel.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.dragId = e.pointerId;
      this.startX = e.clientX;
      wheel.setPointerCapture(e.pointerId);
      wheel.classList.add('is-grab');
    });
    wheel.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.dragId) return;
      const dx = e.clientX - this.startX;
      const norm = Math.max(-1, Math.min(1, dx / this.range));
      // Drag right → wheel spins clockwise → car turns right. steerInput +1 = LEFT
      // (see Vehicle3D), so the emitted axis is the negated drag.
      this.setAxis(-norm, norm * 46);
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.dragId) return;
      this.dragId = -1;
      wheel.classList.remove('is-grab');
      this.setAxis(0, 0);
    };
    wheel.addEventListener('pointerup', release);
    wheel.addEventListener('pointercancel', release);

    // --- Gas pedal: hold to accelerate --------------------------------------
    let gasPointer = -1;
    const gasDown = (e: PointerEvent) => {
      e.preventDefault();
      if (gasPointer !== -1) return;
      gasPointer = e.pointerId;
      pedal.setPointerCapture(e.pointerId);
      pedal.classList.add('is-down');
      bus.emit(GameEvent.ControlThrottle, true);
    };
    const gasUp = (e: PointerEvent) => {
      if (e.pointerId !== gasPointer) return;
      e.preventDefault();
      gasPointer = -1;
      pedal.classList.remove('is-down');
      bus.emit(GameEvent.ControlThrottle, false);
    };
    pedal.addEventListener('pointerdown', gasDown);
    pedal.addEventListener('pointerup', gasUp);
    pedal.addEventListener('pointercancel', gasUp);

    // --- Reverse: hold to back up --------------------------------------------
    let reversePointer = -1;
    const reverseDown = (e: PointerEvent) => {
      e.preventDefault();
      if (reversePointer !== -1) return;
      reversePointer = e.pointerId;
      reverse.setPointerCapture(e.pointerId);
      reverse.classList.add('is-down');
      bus.emit(GameEvent.ControlReverse, true);
    };
    const reverseUp = (e: PointerEvent) => {
      if (e.pointerId !== reversePointer) return;
      e.preventDefault();
      reversePointer = -1;
      reverse.classList.remove('is-down');
      bus.emit(GameEvent.ControlReverse, false);
    };
    reverse.addEventListener('pointerdown', reverseDown);
    reverse.addEventListener('pointerup', reverseUp);
    reverse.addEventListener('pointercancel', reverseUp);

    // --- Keyboard (desktop) --------------------------------------------------
    this.onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') this.setKeyAxis(1);
      else if (e.key === 'ArrowRight' || e.key === 'd') this.setKeyAxis(-1);
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') bus.emit(GameEvent.ControlThrottle, true);
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'r') bus.emit(GameEvent.ControlReverse, true);
    };
    this.onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') this.setKeyAxis(0);
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') bus.emit(GameEvent.ControlThrottle, false);
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'r') bus.emit(GameEvent.ControlReverse, false);
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private setAxis(axis: number, faceDeg: number): void {
    this.axis = axis;
    this.face.style.transform = `rotate(${faceDeg}deg)`;
    bus.emit(GameEvent.ControlSteerAxis, axis);
  }

  private setKeyAxis(a: number): void {
    this.keyAxis = a;
    this.face.style.transform = `rotate(${-a * 46}deg)`;
    bus.emit(GameEvent.ControlSteerAxis, a);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.root.remove();
  }
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
    .dr-drive { position: fixed; left: 0; right: 0;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
      display: flex; justify-content: space-between; align-items: flex-end;
      padding: 0 14px; z-index: 6; touch-action: none; user-select: none;
      pointer-events: none; }

    /* Steering wheel — responsive; 'font-size: var(--wheel)' lets the spokes/hub/
       mark scale as fractional em with the (clamped) wheel diameter. */
    .dr-wheel { --wheel: clamp(120px, 33vw, 168px); width: var(--wheel); height: var(--wheel);
      font-size: var(--wheel); touch-action: none; pointer-events: auto;
      display: flex; align-items: center; justify-content: center;
      -webkit-tap-highlight-color: transparent; opacity: 0.94; }
    .dr-wheel-face { position: relative; width: 0.88em; height: 0.88em; border-radius: 50%;
      background: radial-gradient(circle at 38% 32%, #3a4560, #1a2230 68%);
      border: 0.088em solid #222b3b;
      box-shadow: 0 8px 20px rgba(0,0,0,0.45), inset 0 0 0 3px rgba(255,255,255,0.05),
        inset 0 3px 10px rgba(255,255,255,0.08);
      transition: transform .12s ease-out; will-change: transform; }
    .dr-wheel.is-grab .dr-wheel-face { transition: none;
      box-shadow: 0 8px 20px rgba(0,0,0,0.45), inset 0 0 0 3px rgba(55,214,122,0.4),
        inset 0 3px 10px rgba(255,255,255,0.08); }
    .dr-spoke { position: absolute; background: #2a3242; border-radius: 0.024em; }
    .dr-spoke-h { top: 50%; left: 8%; right: 8%; height: 0.095em; transform: translateY(-50%); }
    .dr-spoke-v { left: 50%; top: 46%; bottom: 8%; width: 0.095em; transform: translateX(-50%); }
    .dr-hub { position: absolute; top: 50%; left: 50%; width: 0.27em; height: 0.27em;
      margin: -0.135em 0 0 -0.135em; border-radius: 50%;
      background: radial-gradient(circle at 40% 35%, #4a5674, #232c3e);
      box-shadow: inset 0 2px 4px rgba(255,255,255,0.15), 0 2px 6px rgba(0,0,0,0.4); }
    .dr-mark { position: absolute; top: 0.03em; left: 50%; width: 0.072em; height: 0.072em;
      margin-left: -0.036em; border-radius: 50%; background: #37d67a;
      box-shadow: 0 0 8px rgba(55,214,122,0.8); }

    /* Gas pedal (+ the smaller reverse button stacked above it) — responsive so
       they never dominate a narrow portrait viewport / occlude the car. */
    .dr-pedal-group { display: flex; flex-direction: column; align-items: center; gap: 9px;
      pointer-events: auto; }
    .dr-pedal { width: clamp(96px, 26vw, 132px); height: clamp(120px, 30vw, 150px);
      border: none; border-radius: 24px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
      color: #06210f; font-family: system-ui, sans-serif; font-weight: 900; opacity: 0.9;
      background: linear-gradient(#43e084, #1f9d52);
      box-shadow: 0 8px 0 #17773d, 0 12px 22px rgba(0,0,0,0.4),
        inset 0 3px 8px rgba(255,255,255,0.35);
      transition: transform .05s ease, box-shadow .05s ease;
      touch-action: none; -webkit-tap-highlight-color: transparent; }
    .dr-pedal.is-down { transform: translateY(6px);
      box-shadow: 0 2px 0 #17773d, 0 6px 12px rgba(0,0,0,0.4), inset 0 3px 8px rgba(255,255,255,0.25); }
    .dr-pedal-arrow { font-size: clamp(30px, 9vw, 42px); line-height: 1; }
    .dr-pedal-label { font-size: clamp(12px, 3.4vw, 16px); letter-spacing: 0.12em; }

    .dr-reverse { width: clamp(58px, 15vw, 80px); height: clamp(36px, 9vw, 50px);
      border: none; border-radius: 16px;
      display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 6px;
      color: #fff1e0; font-family: system-ui, sans-serif; font-weight: 900; opacity: 0.9;
      background: linear-gradient(#5a6478, #333c4e);
      box-shadow: 0 6px 0 #23293a, 0 10px 18px rgba(0,0,0,0.4),
        inset 0 2px 6px rgba(255,255,255,0.18);
      transition: transform .05s ease, box-shadow .05s ease;
      touch-action: none; -webkit-tap-highlight-color: transparent; }
    .dr-reverse.is-down { transform: translateY(4px);
      box-shadow: 0 2px 0 #23293a, 0 4px 10px rgba(0,0,0,0.4), inset 0 2px 6px rgba(255,255,255,0.12); }
    .dr-reverse-arrow { font-size: clamp(15px, 4.6vw, 20px); line-height: 1; }
    .dr-reverse-label { font-size: clamp(11px, 3.2vw, 13px); letter-spacing: 0.1em; }
  `;
  document.head.appendChild(s);
}
