import { useEffect, useRef, useState } from 'react';
import { mountPanel } from '../scene/panel-scene.js';

// Three chapters. The scene stays fixed on wide screens and each chapter lights its part.
const steps = [
  {
    part: 'cells',
    title: 'Las células capturan la luz',
    text: 'Cada célula del panel convierte la luz del sol en electricidad. Cuanto más sol llega a tu tejado, más produce.',
  },
  {
    part: 'frame',
    title: 'El marco protege el conjunto',
    text: 'La estructura sujeta el panel al tejado y resiste el viento y la lluvia. La revisamos en la visita técnica.',
  },
  {
    part: 'inverter',
    title: 'El inversor lo deja listo para tu casa',
    text: 'Convierte la corriente del panel en la que usa tu casa. Es la pieza que decide cuánta energía aprovechas.',
  },
];

export default function HowItWorks() {
  const sceneRef = useRef(null);
  const stepRefs = useRef([]);
  const [active, setActive] = useState(0);

  // Scene: mount once; the handle is kept so chapters can light its parts.
  const handleRef = useRef(null);
  useEffect(() => {
    let alive = true;
    // Mount only when the section is near the viewport (keeps Three.js off the first paint).
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || handleRef.current) return;
        mountPanel(sceneRef.current).then((h) => {
          if (!alive) return h.destroy();
          handleRef.current = h;
          handleRef.current.setPart(steps[0].part);
        });
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(sceneRef.current);
    return () => {
      alive = false;
      observer.disconnect();
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  // Chapters: the one nearest the middle of the screen is active.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.index));
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Light the part of the active chapter. The scene may still be loading: it reads on mount too.
  useEffect(() => {
    handleRef.current?.setPart(steps[active].part);
  }, [active]);

  return (
    <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="py-section">
      <div className="mx-auto grid max-w-page gap-10 px-4 md:grid-cols-12 md:px-6 lg:px-8">
        <div className="md:sticky md:top-24 md:col-span-6 md:self-start">
          <p className="mb-2 text-sm font-semibold text-primary-700">Cómo funciona</p>
          <h2 id="como-funciona-titulo" className="mb-6 text-3xl md:text-4xl">Un panel, tres partes que trabajan juntas</h2>
          <div ref={sceneRef} className="relative aspect-[4/3] w-full" data-scene="panel-chapters">
            <img src="/panel-poster.svg" width="800" height="600" alt="Ilustración de un panel solar con su caja de inversor; el texto de cada tramo describe la parte activa." className="h-full w-full object-contain" />
          </div>
          <p className="mt-3 text-sm text-text-muted" aria-live="polite">
            Ahora: {steps[active].title.toLowerCase()}.
          </p>
        </div>
        <ol className="flex flex-col gap-6 md:col-span-6 md:gap-[40vh] md:py-[20vh]">
          {steps.map((s, i) => (
            <li
              key={s.part}
              ref={(el) => (stepRefs.current[i] = el)}
              data-index={i}
              className={`rounded-lg border p-6 transition-colors duration-base ${
                i === active ? 'border-accent-400 bg-accent-50' : 'border-border bg-surface-raised'
              }`}
            >
              <span className="mb-2 block text-sm font-semibold text-primary-700">Paso {i + 1}</span>
              <h3 className="mb-2 text-xl">{s.title}</h3>
              <p className="text-text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
