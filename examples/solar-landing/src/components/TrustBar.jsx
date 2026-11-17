// Three plain trust facts. No logos and no numbers until the client confirms them (PRODUCT.md, P1-P3).
const trust = ['Instaladores certificados', 'Instalaciones realizadas', 'Garantías por escrito'];

export default function TrustBar() {
  return (
    <section id="garantias" aria-label="Confianza" className="border-y border-border bg-surface-raised">
      <ul className="mx-auto grid max-w-page gap-4 px-4 py-6 text-center sm:grid-cols-3 md:px-6 lg:px-8">
        {trust.map((t) => (
          <li key={t} className="font-semibold text-primary-800">{t}</li>
        ))}
      </ul>
    </section>
  );
}
