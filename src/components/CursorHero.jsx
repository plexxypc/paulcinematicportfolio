import { useCallback, useEffect, useRef, useState } from 'react';
import { ContactFab, ContactModal } from './ContactOptions';

const FRAME_COUNT = 64;
const BG_COLOR = '#160a0a';

// Face reference point as a fraction of the canvas — where the character's
// face sits when the source image covers the full viewport. Tune these two
// numbers first if the tracking feels "off" relative to the actual portrait.
const FACE_X_FRACTION = 0.5;
const FACE_Y_FRACTION = 0.36;

// Deadzone radius as a fraction of the smaller viewport dimension.
const DEADZONE_ENTER = 0.12;
const DEADZONE_EXIT = 0.15; // slightly larger than enter, to prevent flicker at the boundary

const LERP_FACTOR = 0.26;

function normalizeAngle(deg) {
  let a = deg % 360;
  if (a < 0) a += 360;
  return a;
}

// Shortest-path circular interpolation so the head doesn't spin the long way
// around when crossing the 0/360 boundary.
function lerpAngle(current, target, t) {
  let delta = ((target - current + 540) % 360) - 180;
  return normalizeAngle(current + delta * t);
}

export default function CursorHero() {
  const canvasRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);

  const framesRef = useRef([]);
  const centerFrameRef = useRef(null);
  const framesLoadedRef = useRef(false);

  const mouseRef = useRef({ x: -9999, y: -9999 });
  const hasPointerRef = useRef(false);
  const currentAngleRef = useRef(0);
  const inDeadzoneRef = useRef(true);

  const cursorPosRef = useRef({ x: 0, y: 0 });

  const [is_contact_modal_open, set_is_contact_modal_open] = useState(false);

  // Preload all frames once on mount.
  useEffect(() => {
    let loaded = 0;
    const total = FRAME_COUNT + 1;
    const frames = new Array(FRAME_COUNT);

    function checkDone() {
      loaded += 1;
      if (loaded === total) framesLoadedRef.current = true;
    }

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = `/frames/frame_${String(i).padStart(2, '0')}.webp`;
      img.onload = checkDone;
      img.onerror = checkDone;
      frames[i] = img;
    }
    framesRef.current = frames;

    const centerImg = new Image();
    centerImg.src = '/frames/center.webp';
    centerImg.onload = checkDone;
    centerImg.onerror = checkDone;
    centerFrameRef.current = centerImg;
  }, []);

  // Mouse + touch tracking.
  useEffect(() => {
    function onMove(e) {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      mouseRef.current = { x, y };
      hasPointerRef.current = true;
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, []);

  // Canvas sizing.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Main render loop.
  useEffect(() => {
    let rafId;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function drawImageCover(img) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return;

      const scale = Math.max(vw / iw, vh / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (vw - dw) / 2;
      const dy = (vh - dh) / 2;

      ctx.clearRect(0, 0, vw, vh);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, vw, vh);
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    function tick() {
      if (framesLoadedRef.current) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const faceX = vw * FACE_X_FRACTION;
        const faceY = vh * FACE_Y_FRACTION;

        const { x: mx, y: my } = mouseRef.current;
        const dx = mx - faceX;
        const dy = my - faceY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDim = Math.min(vw, vh);

        // Hysteresis on the deadzone boundary to prevent rapid flicker.
        const threshold = inDeadzoneRef.current
          ? DEADZONE_EXIT * minDim
          : DEADZONE_ENTER * minDim;
        inDeadzoneRef.current = !hasPointerRef.current || dist < threshold;

        if (!inDeadzoneRef.current) {
          const targetAngle = normalizeAngle((Math.atan2(dx, -dy) * 180) / Math.PI);
          currentAngleRef.current = lerpAngle(currentAngleRef.current, targetAngle, LERP_FACTOR);
        }

        if (inDeadzoneRef.current) {
          drawImageCover(centerFrameRef.current);
        } else {
          const idx = Math.round(currentAngleRef.current / (360 / FRAME_COUNT)) % FRAME_COUNT;
          drawImageCover(framesRef.current[idx]);
        }
      }

      // Custom cursor follow (slightly lagged for a "magnetic" feel).
      const cp = cursorPosRef.current;
      cp.x += (mouseRef.current.x - cp.x) * 0.35;
      cp.y += (mouseRef.current.y - cp.y) * 0.35;
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${mouseRef.current.x}px, ${mouseRef.current.y}px)`;
      }
      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate(${cp.x}px, ${cp.y}px)`;
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  function magnetize() {
    cursorRingRef.current?.classList.add('cursor-ring--active');
  }
  function demagnetize() {
    cursorRingRef.current?.classList.remove('cursor-ring--active');
  }

  /**
   * Closes the contact modal and resets the cursor ring, since the hovered
   * element unmounts without firing mouseleave.
   *
   * @returns {void}
   */
  const close_contact_modal = useCallback(() => {
    set_is_contact_modal_open(false);
    cursorRingRef.current?.classList.remove('cursor-ring--active');
  }, []);

  return (
    <div className="hero-root">
      <canvas ref={canvasRef} className="hero-canvas" />

      <nav className="nav-pill" onMouseEnter={magnetize} onMouseLeave={demagnetize}>
        <a href="https://paul-udor.vercel.app/#work" target="_blank" rel="noreferrer">Work</a>
        <a href="https://paul-udor.vercel.app/about" target="_blank" rel="noreferrer">About</a>
        <a href="https://paul-udor.vercel.app/#contact" target="_blank" rel="noreferrer">Contact</a>
      </nav>

      <div className="hero-copy">
        <p className="hero-greeting">Hi, I&apos;m</p>
        <h1 className="hero-name">Paul Udor</h1>
        <p className="hero-bio">
          A content marketer and web developer looking to help businesses grow and reach their audience.
          <br />
          I turn ideas into interfaces people enjoy using.
          <br />
          Open to freelance and full-time work.
        </p>
        <div className="hero-actions">
          <a
            href="https://paul-udor.vercel.app/resume/paul-udor-resume.pdf"
            target="_blank"
            rel="noreferrer"
            className="btn btn--solid"
            onMouseEnter={magnetize}
            onMouseLeave={demagnetize}
          >
            Resume <span aria-hidden="true">&rarr;</span>
          </a>
          <button
            type="button"
            className="btn btn--ghost"
            aria-haspopup="dialog"
            onClick={() => set_is_contact_modal_open(true)}
            onMouseEnter={magnetize}
            onMouseLeave={demagnetize}
          >
            Let&apos;s Talk
          </button>
        </div>
      </div>

      <ContactFab on_hover_start={magnetize} on_hover_end={demagnetize} />
      <ContactModal
        is_open={is_contact_modal_open}
        on_close={close_contact_modal}
        on_hover_start={magnetize}
        on_hover_end={demagnetize}
      />

      <div ref={cursorDotRef} className="cursor-dot" />
      <div ref={cursorRingRef} className="cursor-ring" />
    </div>
  );
}
