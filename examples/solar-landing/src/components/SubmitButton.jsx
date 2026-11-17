import { Button } from '@/components/ui/button';

// Submit with its states: idle and sending. Disabled while sending so one click sends once (flow-forms).
export default function SubmitButton({ sending = false }) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={sending}
      aria-busy={sending}
      className="bg-accent-400 font-semibold text-on-accent hover:bg-accent-300"
    >
      {sending ? 'Enviando…' : 'Enviar y recibir presupuesto'}
    </Button>
  );
}
