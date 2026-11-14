import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Crosshair, Minus, Plus } from 'lucide-react';
import { presetLinks } from './missionDestinations.mjs';

const stations = [
  {
    label: 'Space Station',
    detail: '21% O₂ / 1 atm',
    href: presetLinks.station,
    x: 0.19,
    y: 0.37,
    radius: 42,
  },
  {
    label: 'Moon Base',
    detail: '34% O₂ / 0.57 atm',
    href: presetLinks.moon,
    x: 0.43,
    y: 0.53,
    radius: 66,
  },
  {
    label: 'Mars Base',
    detail: '34% O₂ / 0.57 atm',
    href: presetLinks.mars,
    x: 0.76,
    y: 0.22,
    radius: 46,
  },
  {
    label: 'Pressurized Rover',
    detail: 'Lunar preset',
    href: presetLinks.rover,
    x: 0.68,
    y: 0.76,
    radius: 38,
  },
  {
    label: 'Neural Lab',
    detail: 'FLEX model check',
    href: '/neural',
    x: 0.83,
    y: 0.49,
    radius: 52,
  },
];
const connections = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 4],
  [3, 4],
];
const initial = { x: 0, y: 0, zoom: 1 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function drawMap(canvas, width, height) {
  const density = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * density);
  canvas.height = Math.round(height * density);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(density, density);
  let seed = 275;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const scale = Math.min(width / 750, height / 520);
  const bodies = stations.map(({ x, y, radius }) => ({
    x: x * width,
    y: y * height,
    radius: radius * scale,
  }));

  for (let index = 0; index < 210; index++) {
    const x = random() * width;
    const y = random() * height;
    const alpha = 0.12 + random() * 0.46;
    ctx.fillStyle = index % 13 === 0 ? '#78d8d9' : `rgba(214, 235, 237, ${alpha})`;
    ctx.fillRect(x, y, index % 15 === 0 ? 1.8 : 0.8, index % 15 === 0 ? 1.8 : 0.8);
  }

  for (const [a, b] of connections) {
    const start = bodies[a];
    const end = bodies[b];
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    for (let thread = 0; thread < 24; thread++) {
      const t = (thread / 23 - 0.5) * 2;
      const sAngle = angle + t * 1.13;
      const eAngle = angle + Math.PI - t * 1.13;
      const sx = start.x + Math.cos(sAngle) * start.radius;
      const sy = start.y + Math.sin(sAngle) * start.radius;
      const ex = end.x + Math.cos(eAngle) * end.radius;
      const ey = end.y + Math.sin(eAngle) * end.radius;
      const pull = length * (0.25 + random() * 0.19);
      ctx.strokeStyle = thread % 7 === 0 ? 'rgba(121,218,220,.42)' : 'rgba(211,231,234,.29)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + Math.sin(sAngle) * pull,
        sy - Math.cos(sAngle) * pull,
        ex - Math.sin(eAngle) * pull,
        ey + Math.cos(eAngle) * pull,
        ex,
        ey,
      );
      ctx.stroke();
    }
  }

  bodies.forEach(({ x, y, radius }, index) => {
    const glow = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius * 1.13);
    glow.addColorStop(0, index === 1 ? '#16262a' : '#101a1e');
    glow.addColorStop(0.77, '#0b1014');
    glow.addColorStop(1, 'rgba(7,13,17,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.13, 0, Math.PI * 2);
    ctx.fill();
    for (let ring = 0; ring < 14; ring++) {
      const tilt = (ring - 7) * 0.14 + index * 0.45;
      const orbit = radius * (0.9 + ring * 0.026);
      ctx.strokeStyle = ring % 5 === 0 ? 'rgba(102,217,220,.54)' : 'rgba(220,239,239,.23)';
      ctx.lineWidth = ring % 5 === 0 ? 0.95 : 0.6;
      ctx.beginPath();
      ctx.ellipse(
        x + (ring - 7) * 0.6,
        y,
        orbit,
        orbit * (0.79 + (ring % 5) * 0.04),
        tilt,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.strokeStyle = index === 1 ? '#8cdddd' : 'rgba(157,212,217,.57)';
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

export default function MissionMap() {
  const canvas = useRef(null);
  const gesture = useRef(null);
  const frame = useRef(0);
  const [camera, setCamera] = useState(initial);
  const [active, setActive] = useState(1);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    const observer = new ResizeObserver(([{ contentRect }]) => {
      drawMap(element, contentRect.width, contentRect.height);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);

  function zoom(delta) {
    setCamera(({ x, y, zoom }) => ({ x, y, zoom: clamp(zoom + delta, 0.85, 1.6) }));
  }

  function centerOn(next) {
    const station = stations[next];
    const bounds = canvas.current.getBoundingClientRect();
    setActive(next);
    setCamera({
      x: (0.5 - station.x) * (bounds.width / camera.zoom),
      y: (0.5 - station.y) * (bounds.height / camera.zoom),
      zoom: 1.16,
    });
  }

  function reveal(event, index) {
    if (!event.currentTarget.matches(':focus-visible')) return;
    const pin = event.currentTarget.getBoundingClientRect();
    const map = event.currentTarget.closest('.orbit-viewport').getBoundingClientRect();
    if (
      pin.left < map.left ||
      pin.right > map.right ||
      pin.top < map.top ||
      pin.bottom > map.bottom
    ) {
      centerOn(index);
    }
  }

  function start(event) {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('a')) return;
    gesture.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, camera };
    event.currentTarget.setPointerCapture(event.pointerId);
    setMoving(true);
  }

  function move(event) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const { width, height } = event.currentTarget.getBoundingClientRect();
    const x = clamp(drag.camera.x + event.clientX - drag.startX, -width * 0.48, width * 0.48);
    const y = clamp(drag.camera.y + event.clientY - drag.startY, -height * 0.44, height * 0.44);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setCamera({ ...drag.camera, x, y }));
  }

  function stop() {
    if (!gesture.current) return;
    gesture.current = null;
    setMoving(false);
  }

  return (
    <section className="orbit-map" aria-label="Interactive mission map">
      <div className="orbit-map-caption">
        <Crosshair size={17} aria-hidden="true" />
        <span>Mission map</span>
        <span className="orbit-map-hint">Drag to explore</span>
      </div>
      <div
        className="orbit-viewport"
        data-moving={moving}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
      >
        <div
          className="orbit-camera"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
        >
          <canvas ref={canvas} aria-hidden="true" />
          {stations.map((station, index) => (
            <a
              key={station.label}
              href={station.href}
              className="orbit-pin"
              data-selected={active === index}
              onFocus={(event) => reveal(event, index)}
              style={{
                left: `${station.x * 100}%`,
                top: `${station.y * 100}%`,
                '--pin-scale': 1 / camera.zoom,
              }}
            >
              <span className="orbit-pin-dot" aria-hidden="true" />
              <span>{station.label}</span>
            </a>
          ))}
        </div>
      </div>
      <div className="orbit-map-controls">
        <div className="orbit-view-controls" role="group" aria-label="Map view">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoom(-0.15)}
            disabled={camera.zoom <= 0.85}
          >
            <Minus size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoom(0.15)}
            disabled={camera.zoom >= 1.6}
          >
            <Plus size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Reset map"
            onClick={() => {
              setCamera(initial);
              setActive(1);
            }}
          >
            <Crosshair size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="orbit-station-controls" role="group" aria-label="Browse map stations">
          <button
            type="button"
            aria-label="Previous station"
            onClick={() => centerOn((active + stations.length - 1) % stations.length)}
          >
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <a href={stations[active].href} aria-live="polite">
            {stations[active].label}
            <small>{stations[active].detail}</small>
          </a>
          <button
            type="button"
            aria-label="Next station"
            onClick={() => centerOn((active + 1) % stations.length)}
          >
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
