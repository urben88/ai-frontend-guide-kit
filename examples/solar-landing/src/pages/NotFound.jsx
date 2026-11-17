import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import NotFoundLinks from '../components/NotFoundLinks.jsx';

// 404 (UX-SPEC.md): plain words, no blame, two exits.
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-form px-4 py-section text-center md:px-6">
        <h1 className="mb-4 text-3xl md:text-4xl">Esta página no existe o se ha movido</h1>
        <p className="mb-8 text-lg text-text-muted">Puedes volver a la landing o pedir tu presupuesto directamente.</p>
        <NotFoundLinks />
      </main>
      <Footer />
    </>
  );
}
