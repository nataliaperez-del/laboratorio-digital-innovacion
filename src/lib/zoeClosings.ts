/**
 * Cierres de ZOE: la frase con la que termina cuando pregunta si seguimos o recuerda que acompaña
 * («¿Todo listo para continuar? Estoy aquí contigo»). Dicha siempre igual suena a grabación, así que
 * aquí se intercala: si el cierre de una respuesta ya se usó hace poco, se cambia por otro.
 *
 * Lógica pura, para poder probarla.
 */

/** Maneras de preguntar si seguimos y de recordar que ZOE acompaña, todas con el mismo sentido. */
export const CLOSINGS: readonly string[] = [
  '¿Todo listo para continuar? Estoy aquí contigo.',
  '¿Seguimos? Voy a tu ritmo.',
  'Cuando quieras continuamos; no hay afán.',
  '¿Vamos por lo que sigue? Te acompaño.',
  'Tú me dices y seguimos, sin prisa.',
  '¿Le damos al siguiente paso? Tú marcas el compás.',
  '¿Continuamos? Aquí me tienes.',
  '¿Avanzamos cuando estés a gusto? Aquí sigo.',
  '¿Listo para el siguiente tramo? Yo voy contigo.',
  'Tómate tu tiempo; apenas quieras, arrancamos.',
];

/** Coletillas del recorrido guiado, para que cada parada no termine igual. */
export const COMPANY_LINES: readonly string[] = ['Estoy aquí contigo.', 'Voy a tu ritmo.', 'Tú marcas el paso.', 'Sin afán, yo te sigo.', 'Aquí sigo, a tu lado.', 'Cuando tú digas.'];

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

/** ¿Esta oración pregunta si seguimos? */
const READY = /\b(todo listo|list[oa]s? para (continuar|seguir|avanzar|empezar|el siguiente)|seguimos|continuamos|avanzamos|vamos por lo que sigue|le damos al siguiente)\b/;
/** ¿Esta oración recuerda que ZOE acompaña? */
const COMPANY = /\b(estoy (aqui )?contigo|aqui estoy contigo|voy a tu ritmo|te acompano|aqui me tienes|aqui sigo|yo voy contigo|tu marcas)\b/;

const isClosingSentence = (sentence: string) => {
  const s = fold(sentence);
  return s.split(' ').length <= 12 && (READY.test(s) || COMPANY.test(s));
};

/** Parte la respuesta en su cuerpo y su cierre (las últimas oraciones, hasta dos, que son de cierre). */
export function splitClosing(reply: string): { body: string; closing: string } {
  const sentences = reply.trim().match(/[^.!?…]+[.!?…]+["»”']?|[^.!?…]+$/g) ?? [];
  let cut = sentences.length;
  while (cut > 0 && sentences.length - cut < 2 && isClosingSentence(sentences[cut - 1])) cut--;
  return { body: sentences.slice(0, cut).join('').trim(), closing: sentences.slice(cut).join('').trim() };
}

/**
 * Devuelve la respuesta con un cierre que no repita los de las respuestas recientes de ZOE.
 * Si la respuesta no termina en un cierre, o el suyo es nuevo, queda igual.
 */
export function varyClosing(reply: string, recentReplies: readonly string[], random: () => number = Math.random): string {
  const { body, closing } = splitClosing(reply);
  if (!closing) return reply;
  const used = recentReplies
    .slice(-4)
    .map((r) => fold(splitClosing(r).closing))
    .filter(Boolean);
  if (!used.includes(fold(closing))) return reply;
  const fresh = CLOSINGS.filter((c) => !used.includes(fold(c)) && fold(c) !== fold(closing));
  const next = fresh[Math.floor(random() * fresh.length)] ?? CLOSINGS[0];
  return body ? `${body} ${next}` : next;
}
