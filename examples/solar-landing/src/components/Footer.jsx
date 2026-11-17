import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface-raised">
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
        <p className="text-sm text-text-muted">Solar Casa · Instalación de placas solares para particulares en España.</p>
        <nav aria-label="Legal y contacto" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href="#contacto" className="text-primary-800 hover:text-primary-900">Contacto</a>
          <Link to="/presupuesto" className="text-primary-800 hover:text-primary-900">Pedir presupuesto</Link>
          <a href="#privacidad" className="text-primary-800 hover:text-primary-900">Política de privacidad</a>
          <a href="#aviso-legal" className="text-primary-800 hover:text-primary-900">Aviso legal</a>
        </nav>
      </div>
    </footer>
  );
}
