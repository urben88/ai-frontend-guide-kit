import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

// Confirmation: what happens next, and one next action (flow-forms, step 8).
export default function Gracias() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-form px-4 py-section text-center md:px-6">
        <h1 className="mb-4 text-3xl md:text-4xl">Hemos recibido tu solicitud</h1>
        <p className="mb-6 text-lg text-text-muted">
          Un técnico te llamará para hablar de tu presupuesto. Solo te llamamos si lo pediste.
        </p>
        <p className="mb-8 text-text">Mientras tanto, puedes repasar cómo funciona una instalación.</p>
        <Link
          to="/#como-funciona"
          className="inline-flex min-h-11 items-center rounded-md border border-primary-800 px-6 py-3 font-semibold text-primary-900 hover:bg-primary-50"
        >
          Volver a la landing
        </Link>
      </main>
      <Footer />
    </>
  );
}
