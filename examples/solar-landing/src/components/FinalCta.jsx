import CtaButton from './CtaButton.jsx';

// Closing call to action: the same action and promise as the hero, after the whole story (recipe final-cta).
export default function FinalCta() {
  return (
    <section aria-labelledby="cierre-titulo" className="bg-primary-900 py-section text-on-primary">
      <div className="mx-auto max-w-prose px-4 text-center md:px-6">
        <h2 id="cierre-titulo" className="mb-4 text-3xl text-on-primary md:text-4xl">¿Te compensa? Lo sabrás en la visita</h2>
        <p className="mb-8 text-primary-100">Pide tu presupuesto. No te llamamos si no lo pides.</p>
        <CtaButton>Pedir presupuesto</CtaButton>
      </div>
    </section>
  );
}
