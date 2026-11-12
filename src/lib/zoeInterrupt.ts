/**
 * Interrumpir a ZOE sin perder el hilo: qué alcanzó a decir, qué faltaba y cuándo la persona
 * pide que continúe.
 */

/** Frases de un texto, con su puntuación. */
function sentencesOf(text: string): string[] {
  return (text.match(/[^.!?…\n]+[.!?…]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

/**
 * Lo que faltaba por decir cuando se cortó. `said` son los tramos que sí empezaron a sonar: el último
 * se cuenta como dicho (ya estaba sonando). Si el texto de los tramos no se encuentra tal cual en el
 * original (la voz puede reescribir cifras o siglas), se cuenta por frases.
 */
export function remainingAfter(full: string, said: readonly string[]): string {
  if (!said.length) return full.trim();
  const last = said[said.length - 1].trim();
  const at = last ? full.lastIndexOf(last) : -1;
  if (at >= 0) return full.slice(at + last.length).trim();
  return sentencesOf(full).slice(said.length).join(' ').trim();
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const RESUME =
  /^(?:(?:y\s+)?(?:bueno\s+|ok\s+|dale\s+|por\s+favor\s+)?(?:sigue|sigamos|continua|continuemos|termina|termine|prosigue|retoma|retomemos|seguias|continuabas)(?:\s+(?:con\s+)?(?:eso|lo\s+que\s+(?:me\s+)?(?:decias|ibas\s+a\s+decir|estabas\s+diciendo)|lo\s+anterior|por\s+favor|ahi|ya|zoe))*|dime\s+(?:el\s+)?resto|que\s+(?:me\s+)?(?:decias|ibas\s+a\s+decir)|en\s+que\s+ibas|ibas\s+diciendo|lo\s+que\s+(?:me\s+)?(?:decias|ibas\s+a\s+decir)|y\s+luego|y\s+que\s+mas|entonces)\s*$/;

/** ¿Pide que ZOE siga con lo que estaba diciendo? Solo frases cortas: lo demás es un tema nuevo. */
export function isResumeRequest(text: string): boolean {
  const t = fold(text);
  return t.length > 0 && t.split(' ').length <= 8 && RESUME.test(t);
}
