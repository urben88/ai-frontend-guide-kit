// Sends the budget request. The endpoint is set by the client in .env (VITE_PRESUPUESTO_URL).
// Without it nothing is sent and the caller gets a clear error: no fake success.

export const ERRORES = {
  codigoPostal: 'Escribe 5 números, por ejemplo 28013.',
  consumo: 'Indica cuánto pagas al mes en euros, por ejemplo 90.',
  telefono: 'Escribe 9 números. Empiezan por 6, 7 o 9.',
};

export function validar(v) {
  const e = {};
  if (!/^\d{5}$/.test(v.codigoPostal.trim())) e.codigoPostal = ERRORES.codigoPostal;
  const consumo = Number(String(v.consumo).replace(',', '.'));
  if (!(consumo >= 1 && consumo <= 2000)) e.consumo = ERRORES.consumo;
  if (!/^[679]\d{8}$/.test(v.telefono.replace(/\s/g, ''))) e.telefono = ERRORES.telefono;
  return e;
}

export class ConfigError extends Error {}
export class NetworkError extends Error {}

export async function enviarPresupuesto(datos) {
  const url = import.meta.env.VITE_PRESUPUESTO_URL;
  if (!url) throw new ConfigError('Falta VITE_PRESUPUESTO_URL.');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
  } catch {
    throw new NetworkError('Sin conexión.');
  }
  if (!res.ok) throw new NetworkError(`Respuesta ${res.status}.`);
}
