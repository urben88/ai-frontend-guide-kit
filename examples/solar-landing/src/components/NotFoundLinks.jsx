import { Link } from 'react-router-dom';

// Two exits from the 404 page: the landing and the budget form (UX-SPEC.md, 404).
export default function NotFoundLinks() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Link to="/" className="min-h-11 rounded-md border border-primary-800 px-6 py-3 font-semibold text-primary-900 hover:bg-primary-50">
        Ir a la landing
      </Link>
      <Link to="/presupuesto" className="min-h-11 rounded-md bg-accent-400 px-6 py-3 font-semibold text-on-accent hover:bg-accent-300">
        Pedir presupuesto
      </Link>
    </div>
  );
}
