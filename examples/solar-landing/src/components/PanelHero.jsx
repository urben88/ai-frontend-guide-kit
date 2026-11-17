import { useEffect, useRef } from 'react';
import { mountPanel } from '../scene/panel-scene.js';

// The panel that shows the product. Mounts only when near the viewport, so Three.js
// does not compete with the first paint. Without WebGL the poster stays (see panel-scene.js).
export default function PanelHero({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    let handle = null;
    let alive = true;
    const start = () => {
      observer.disconnect();
      // Mount when the browser is idle, so Three.js does not block the first interaction (option A: 3D kept on mobile).
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
      idle(() => mountPanel(ref.current).then((h) => {
        if (alive) handle = h;
        else h.destroy();
      }));
    };
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && start(),
      { rootMargin: '200px 0px' },
    );
    observer.observe(ref.current);
    return () => {
      alive = false;
      observer.disconnect();
      handle?.destroy();
    };
  }, []);
  // The poster is in the markup from the first paint: the box is never empty, and the scene reuses it.
  return (
    <div ref={ref} className={`relative aspect-[4/3] w-full ${className}`} data-scene="panel">
      <img
        src="/panel-poster.svg"
        width="800"
        height="600"
        alt="Ilustración de un panel solar con su caja de inversor; el texto de cada tramo describe la parte activa."
        className="h-full w-full object-contain"
      />
    </div>
  );
}
