import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// The one primary action (DESIGN.md: one filled button per viewport), built on the shadcn Button.
export default function CtaButton({ children = 'Pedir presupuesto' }) {
  return (
    <Button asChild size="lg" className="bg-accent-400 font-semibold text-on-accent hover:bg-accent-300">
      <Link to="/presupuesto">{children}</Link>
    </Button>
  );
}
