import { describe, expect, it } from 'vitest';
import { APOLOGY_REPLY, assessRespect, isApology, respectReply } from '@/lib/zoeRespect';

const first = () => 0;

describe('módulo de respeto de ZOE', () => {
  it('deja pasar mensajes respetuosos y preguntas normales', () => {
    for (const t of ['¿Qué es el TRL?', 'Hola ZOE, ayúdame con el radar', 'Esa computadora es muy lenta', 'Quiero una pera y un burro de carga en mi proyecto agrícola', 'La putamen es parte del cerebro']) {
      expect(assessRespect(t), t).toBeNull();
    }
  });

  it('reconoce groserías sueltas, con variaciones de escritura', () => {
    expect(assessRespect('esto es una mierda')?.level).toBe('soez');
    expect(assessRespect('M13RD@ de aplicación')?.level).toBe('soez');
    expect(assessRespect('qué puuuuta rabia')?.level).toBe('soez');
    expect(assessRespect('gonorrea no funciona')?.level).toBe('soez');
  });

  it('reconoce insultos dirigidos a ZOE', () => {
    expect(assessRespect('eres un perro inútil')?.level).toBe('insulto');
    expect(assessRespect('Eres una estúpida')?.level).toBe('insulto');
    expect(assessRespect('cállate hijueputa')?.level).toBe('insulto');
  });

  it('una palabra suave sin dirigirse a nadie no se reprende', () => {
    expect(assessRespect('qué basura de conexión de internet')).toBeNull();
  });

  it('reconoce amenazas', () => {
    expect(assessRespect('te voy a borrar')?.level).toBe('amenaza');
    expect(assessRespect('ojalá te mueras')?.level).toBe('amenaza');
  });

  it('acompaña la ira sin reprender', () => {
    const v = assessRespect('estoy furioso porque no me sale');
    expect(v?.level).toBe('ira');
    const r = respectReply('estoy furioso porque no me sale', 0, first);
    expect(r?.endConversation).toBe(false);
    expect(r?.text).toMatch(/respira/i);
  });

  it('con ira y una pregunta, acompaña y luego contesta', () => {
    const r = respectReply('me da mucha rabia, ¿cómo hago el árbol?', 0, first);
    expect(r?.verdict.level).toBe('ira');
    expect(r?.answerAfter).toBe(true);
  });

  it('escala: recordatorio amable, firmeza y pausa, siempre con respeto, ética e integridad', () => {
    const one = respectReply('esto es una mierda', 0, first)!;
    const two = respectReply('esto es una mierda', 1, first)!;
    const three = respectReply('esto es una mierda', 2, first)!;
    for (const r of [one, two, three]) expect(r.text).toMatch(/respeto, ética e integridad/);
    expect(one.endConversation).toBe(false);
    expect(two.endConversation).toBe(false);
    expect(three.endConversation).toBe(true);
    expect(three.text).not.toBe(one.text);
  });

  it('no repite la grosería ni insulta de vuelta', () => {
    const r = respectReply('eres un perro estúpido', 0, first)!;
    expect(r.text.toLowerCase()).not.toMatch(/estupid|idiota|mierda/);
  });

  it('si traía una pregunta, invita a repetirla al calmarse', () => {
    const r = respectReply('qué es el TRL, hijueputa', 0, first)!;
    expect(r.text).toMatch(/repíteme tu pregunta/);
  });

  it('recibe las disculpas', () => {
    expect(isApology('perdón, me alteré')).toBe(true);
    expect(isApology('qué es el TRL')).toBe(false);
    expect(APOLOGY_REPLY).toMatch(/sin rencores/);
  });
});
