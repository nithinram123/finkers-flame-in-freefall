import { useEffect, useRef, useState } from 'react';
import { RotateCcw, RotateCw, ScanLine } from 'lucide-react';
import { createMoonRenderer, moonDefaultPose } from '../lib/moon-renderer.mjs';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const copyPose = () => ({
  spin: [...moonDefaultPose.spin],
  light: [...moonDefaultPose.light],
});

export default function MoonScene({ controller }) {
  const surface = useRef(null);
  const drag = useRef(null);
  const [live, setLive] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const canvas = surface.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let engine;
    let frame = 0;
    let visible = true;
    let ready = false;
    let active = true;
    let target = copyPose();
    let current = copyPose();

    const draw = () => {
      frame = 0;
      if (!ready || !visible || document.hidden) return;
      const width = Math.min(
        1000,
        Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 1.65)),
      );
      if (!width) return;
      if (canvas.width !== width || canvas.height !== width) {
        canvas.width = width;
        canvas.height = width;
      }
      let moving = false;
      for (const key of ['spin', 'light']) {
        current[key] = current[key].map((value, index) => {
          const delta = target[key][index] - value;
          if (Math.abs(delta) < 0.002 || reduced.matches) return target[key][index];
          moving = true;
          return value + delta * 0.19;
        });
      }
      engine.draw(current.spin, current.light);
      if (moving) schedule();
    };
    function schedule() {
      if (!frame && ready && visible && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function lost(event) {
      event.preventDefault();
      ready = false;
      setLive(false);
    }
    const restored = () => setGeneration((count) => count + 1);
    try {
      engine = createMoonRenderer(canvas);
    } catch {
      return;
    }
    const resize = new ResizeObserver(schedule);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    resize.observe(canvas);
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', schedule);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);

    controller.current = {
      light(x, y) {
        target.light = [clamp(x, -1.35, 1.35), clamp(y, -1.25, 1.25)];
        schedule();
      },
      turn(yaw, pitch = 0) {
        target.spin = [target.spin[0] + yaw, clamp(target.spin[1] + pitch, -1.1, 1.1)];
        schedule();
      },
      reset() {
        target = copyPose();
        // Wrap the current longitude before resetting to avoid spinning several turns.
        current.spin[0] =
          target.spin[0] +
          Math.atan2(
            Math.sin(current.spin[0] - target.spin[0]),
            Math.cos(current.spin[0] - target.spin[0]),
          );
        schedule();
      },
    };
    engine
      .load()
      .then((loaded) => {
        if (!active || !loaded) return;
        ready = true;
        draw();
        setLive(true);
      })
      .catch(() => {
        // The still is already in the document during loading and on graphics failure.
      });
    return () => {
      active = false;
      ready = false;
      controller.current = null;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', schedule);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      resize.disconnect();
      intersection.disconnect();
      engine.dispose();
    };
  }, [controller, generation]);

  function endDrag(event) {
    drag.current = null;
    event.currentTarget.removeAttribute('data-dragging');
  }

  return (
    <figure className="lunar-scene" data-live={live}>
      <div className="lunar-scene-art">
        <svg className="lunar-orbits" viewBox="0 0 580 580" aria-hidden="true">
          <circle cx="290" cy="290" r="259" />
          <circle cx="290" cy="290" r="276" strokeDasharray="2 7" />
          <path d="M34 290H10m536 0h24M290 34V10m0 536v24" />
          <circle cx="482" cy="102" r="4" className="lunar-orbit-mark" />
        </svg>
        <img
          className="lunar-still"
          src="/lunar/moon-still.webp"
          alt=""
          width="640"
          height="640"
          decoding="async"
          fetchPriority="high"
        />
        <canvas
          ref={surface}
          className="lunar-globe"
          width="640"
          height="640"
          role="img"
          aria-label="3D Moon rendered from NASA Lunar Reconnaissance Orbiter maps"
          onPointerDown={(event) => {
            if (!live || event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.setAttribute('data-dragging', 'true');
            drag.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            controller.current?.turn(
              (event.clientX - drag.current.x) * 0.011,
              -(event.clientY - drag.current.y) * 0.009,
            );
            drag.current = { x: event.clientX, y: event.clientY };
          }}
          onLostPointerCapture={endDrag}
        />
        <span className="lunar-object-index" aria-hidden="true">
          LUNAR SURFACE
        </span>
      </div>
      <figcaption className="lunar-scene-caption">
        <span>{live ? 'Drag to rotate · Move to relight' : 'Lunar Reconnaissance Orbiter'}</span>
        <div className="lunar-scene-controls" role="group" aria-label="Rotate the Moon">
          <button
            type="button"
            aria-label="Rotate Moon left"
            disabled={!live}
            onClick={() => controller.current?.turn(-0.4)}
          >
            <RotateCcw size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Reset Moon orientation"
            disabled={!live}
            onClick={() => controller.current?.reset()}
          >
            <ScanLine size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Rotate Moon right"
            disabled={!live}
            onClick={() => controller.current?.turn(0.4)}
          >
            <RotateCw size={17} aria-hidden="true" />
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
