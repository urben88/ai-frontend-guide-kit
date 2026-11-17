import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import PanelHero from '../components/PanelHero.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import CtaButton from '../components/CtaButton.jsx';
import TrustBar from '../components/TrustBar.jsx';
import FinalCta from '../components/FinalCta.jsx';
import Feature02 from '../components/shadcn-space/blocks/feature-02/index.jsx';
import Faq from '../components/shadcn-space/blocks/faq-01/faq.jsx';

const includes = ['Panel y estructura de fijación', 'Inversor', 'Instalación y puesta en marcha', 'Garantía por escrito'];

export default function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <section aria-labelledby="hero-titulo" className="mx-auto grid max-w-page items-center gap-10 px-4 pb-section pt-10 md:grid-cols-12 md:gap-8 md:px-6 md:pt-16 lg:px-8">
          <div className="md:col-span-6">
            <h1 id="hero-titulo" className="mb-4 text-4xl md:text-5xl">Placas solares para tu casa, con presupuesto claro</h1>
            <p className="mb-8 max-w-prose text-lg text-text-muted">
              Un técnico revisa tu tejado y tu consumo, y te dice cuánto puedes ahorrar, sin compromiso.
            </p>
            <CtaButton />
          </div>
          <div className="md:col-span-6">
            <PanelHero />
          </div>
        </section>

        <TrustBar />

        <section aria-label="Beneficios" className="mx-auto max-w-page px-4 py-section md:px-6 lg:px-8">
          <Feature02 />
        </section>

        <HowItWorks />

        <section id="precios" aria-labelledby="precios-titulo" className="mx-auto max-w-prose px-4 py-section md:px-6">
          <h2 id="precios-titulo" className="mb-4 text-3xl md:text-4xl">Cuánto cuesta</h2>
          <p className="mb-6 text-text-muted">
            El precio depende de tu tejado y de tu consumo. Te lo damos por escrito en el presupuesto, con lo que incluye.
          </p>
          <ul className="mb-8 list-disc space-y-2 pl-5 text-text">
            {includes.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <CtaButton>Pedir mi presupuesto</CtaButton>
        </section>

        <div id="preguntas">
          <Faq />
        </div>

        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
