import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SubmitButton from '../components/SubmitButton.jsx';
import PrivacyNote from '../components/PrivacyNote.jsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/reui/alert';
import { ConfigError, enviarPresupuesto, validar } from '../lib/presupuesto.js';

const campos = [
  { name: 'codigoPostal', label: 'Código postal', hint: 'Donde está tu casa.', autoComplete: 'postal-code', inputMode: 'numeric', maxLength: 5 },
  { name: 'consumo', label: 'Lo que pagas al mes (€)', hint: 'Mira tu última factura de luz.', inputMode: 'decimal' },
  { name: 'telefono', label: 'Teléfono', hint: 'Solo te llamamos para tu presupuesto.', autoComplete: 'tel', inputMode: 'tel' },
];

export default function Presupuesto() {
  const navigate = useNavigate();
  const [valores, setValores] = useState({ codigoPostal: '', consumo: '', telefono: '' });
  const [errores, setErrores] = useState({});
  const [estado, setEstado] = useState('idle'); // idle | enviando | error-red | error-config
  const refs = useRef({});

  const cambiar = (name, value) => {
    const nuevos = { ...valores, [name]: value };
    setValores(nuevos);
    // Once a field has an error, it re-checks on every change so the message clears at once.
    if (errores[name]) setErrores({ ...errores, [name]: validar(nuevos)[name] });
  };

  const alSalir = (name) => {
    const e = validar(valores);
    setErrores((prev) => ({ ...prev, [name]: e[name] }));
  };

  const enviar = async (ev) => {
    ev?.preventDefault();
    const e = validar(valores);
    setErrores(e);
    const primero = campos.find((c) => e[c.name]);
    if (primero) {
      refs.current[primero.name]?.focus();
      return;
    }
    setEstado('enviando');
    try {
      await enviarPresupuesto({ ...valores, consumo: Number(String(valores.consumo).replace(',', '.')) });
      navigate('/gracias');
    } catch (err) {
      setEstado(err instanceof ConfigError ? 'error-config' : 'error-red');
    }
  };

  const hayErrores = Object.values(errores).some(Boolean);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-form px-4 py-section md:px-6">
        <p className="mb-2 text-sm font-semibold text-primary-700">Presupuesto sin compromiso</p>
        <h1 className="mb-4 text-3xl md:text-4xl">Tres datos y te llamamos</h1>
        <p className="mb-8 text-text-muted">Tarda menos de un minuto. Tus datos se quedan aquí si algo falla.</p>

        {hayErrores && (
          <Alert variant="destructive" tabIndex={-1} role="alert" className="mb-6">
            <AlertTitle>Revisa estos campos:</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {campos.filter((c) => errores[c.name]).map((c) => (
                  <li key={c.name}>
                    <a href={`#${c.name}`} onClick={() => refs.current[c.name]?.focus()} className="underline">
                      {c.label}: {errores[c.name]}
                    </a>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {estado === 'error-red' && (
          <Alert variant="destructive" role="alert" className="mb-6">
            <AlertTitle>No hemos podido enviarlo.</AlertTitle>
            <AlertDescription>
              <p>Tus datos siguen aquí.</p>
              <button type="button" onClick={enviar} className="mt-2 rounded-md border border-destructive px-4 py-2 font-semibold">
                Reintentar
              </button>
            </AlertDescription>
          </Alert>
        )}

        {estado === 'error-config' && (
          <Alert role="alert" className="mb-6">
            <AlertTitle>El envío todavía no está conectado.</AlertTitle>
            <AlertDescription>Tus datos siguen aquí.</AlertDescription>
          </Alert>
        )}

        <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
          {campos.map((c) => {
            const id = c.name;
            const err = errores[c.name];
            const describedBy = [`${id}-ayuda`, err ? `${id}-error` : null].filter(Boolean).join(' ');
            return (
              <div key={c.name} className="flex flex-col gap-2">
                <Label htmlFor={id} className="font-semibold text-primary-900">{c.label}</Label>
                <p id={`${id}-ayuda`} className="text-sm text-text-muted">{c.hint}</p>
                <Input
                  id={id}
                  ref={(el) => (refs.current[c.name] = el)}
                  name={c.name}
                  value={valores[c.name]}
                  onChange={(e) => cambiar(c.name, e.target.value)}
                  onBlur={() => alSalir(c.name)}
                  autoComplete={c.autoComplete}
                  inputMode={c.inputMode}
                  maxLength={c.maxLength}
                  aria-invalid={err ? 'true' : 'false'}
                  aria-describedby={describedBy}
                  className={`min-h-11 bg-surface-raised ${err ? 'border-destructive' : ''}`}
                />
                {err && (
                  <p id={`${id}-error`} className="text-sm font-semibold text-danger-700">
                    {err}
                  </p>
                )}
              </div>
            );
          })}

          <SubmitButton sending={estado === 'enviando'} />
          <PrivacyNote />
        </form>

        <p className="mt-10 text-sm">
          <Link to="/" className="underline">Volver a la landing</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
