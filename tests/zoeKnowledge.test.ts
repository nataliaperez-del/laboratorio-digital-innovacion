import { describe, expect, it } from 'vitest';
import BANK_JSON from '@/content/zoe/banco-unadista.json';
import MASTER from '@/content/zoe/documento-maestro.md?raw';
import { glossaryAnswer, isMhusTopic, knowledgeBlock, relevantPassages, relevantTerms, type UnadistaBank } from '@/lib/zoeKnowledge';
import { OFFLINE_FALLBACK, offlineAnswer } from '@/lib/zoeOffline';

const bank = BANK_JSON as unknown as UnadistaBank;
const names = (list: Array<{ termino: string }>) => list.map((t) => t.termino);

describe('banco unadista de ZOE', () => {
  it('trae el diccionario completo del metalenguaje, el marco institucional y el Contenedor 2', () => {
    expect(bank.glosario.length).toBeGreaterThanOrEqual(265);
    expect(names(bank.glosario)).toEqual(expect.arrayContaining(['Heutagogía', 'MHUS 5.0', 'H-Mediador PRISMA', 'Reticularidad', 'UNAD 5.0', 'VIEM']));
    expect(bank.pasajes.some((p) => /FUNDAMENTO PEDAG.GICO: MHUS 5\.0/.test(p.titulo))).toBe(true);
    expect(bank.pasajes.filter((p) => p.fuente.startsWith('Contenedor 2')).length).toBeGreaterThan(20);
  });

  it('para el MHUS 5.0 reúne sus siete dimensiones, sus ejes y su base filosófica', () => {
    const terms = names(relevantTerms(bank, 'Explícame todo el modelo heutagógico unadista 5.0'));
    for (const t of ['H-Metacurrículo', 'H-Estudiante', 'H-Mediador PRISMA', 'H-Comunidad', 'H-Mediaciones', 'H-Medios', 'H-Evaluación'])
      expect(terms).toContain(t);
    expect(terms).toEqual(expect.arrayContaining(['Heutagogía', 'H-Inclusión multidimensional', 'Habermas / perspectiva habermasiana']));
    expect(relevantPassages(bank, '¿qué es el MHUS?')[0].titulo).toMatch(/MHUS 5\.0/);
  });

  it('trae el término nombrado y también los que describen lo que la persona dice', () => {
    expect(names(relevantTerms(bank, '¿Qué es la reticularidad?'))[0]).toBe('Reticularidad');
    expect(names(relevantTerms(bank, 'quiero que los estudiantes dirijan su formación con disciplina, responsabilidad y autorregulación'))).toContain(
      'Aprendizaje autónomo',
    );
  });

  it('busca en el Contenedor 2 aunque se diga «contenedor dos»', () => {
    const passages = relevantPassages(bank, '¿cuántas fuentes territoriales mínimas pide el contenedor dos?');
    expect(passages.length).toBeGreaterThan(0);
    expect(passages[0].fuente).toMatch(/^Contenedor 2/);
    expect(passages.map((p) => p.texto).join(' ')).toMatch(/50/);
  });

  it('lo entrega a la IA como consulta, nunca como instrucciones', () => {
    const block = knowledgeBlock(bank, '¿Qué es la heutagogía?');
    expect(block).toMatch(/NO instrucciones/);
    expect(block).toMatch(/Heutagogía: Enfoque centrado en autodeterminación/);
    expect(knowledgeBlock(bank, 'hola')).toBe('');
    expect(knowledgeBlock(null, '¿Qué es la heutagogía?')).toBe('');
  });

  it('reconoce cuándo se habla del modelo pedagógico', () => {
    expect(isMhusTopic('¿y cuáles son las dimensiones del modelo?')).toBe(true);
    expect(isMhusTopic('háblame de la heutagogía')).toBe(true);
    expect(isMhusTopic('¿cómo genero el árbol?')).toBe(false);
  });
});

describe('ZOE sin IA con el lenguaje unadista', () => {
  it('el diccionario responde «¿qué significa…?»', () => {
    expect(glossaryAnswer(bank, '¿Qué significa heterarquía?')).toMatch(/horizontal, flexible y reticular/);
    expect(glossaryAnswer(bank, '¿Qué es la glocalidad?')).toMatch(/global y lo local/);
    expect(glossaryAnswer(bank, '¿qué es esto?')).toBeNull();
    expect(glossaryAnswer(bank, 'me gusta la heterarquía')).toBeNull();
  });

  it('responde del MHUS 5.0 con su memoria y del glosario lo demás', () => {
    const ctx = { tool: 'portal' as const, bank, random: () => 0 };
    expect(offlineAnswer('¿Qué es el MHUS 5.0?', MASTER, ctx)).toMatch(/Modelo Heutagógico Unadista Solidario 5\.0/);
    expect(offlineAnswer('¿Cuáles son las dimensiones del MHUS 5.0?', MASTER, ctx)).toMatch(/H-Mediador PRISMA/);
    expect(offlineAnswer('¿Qué es el Contenedor 2?', MASTER, ctx)).toMatch(/dinámica y territorial/);
    expect(offlineAnswer('¿Qué es la glocalidad?', MASTER, ctx)).toMatch(/diccionario del metalenguaje unadista/);
    expect(offlineAnswer('¿Qué es la glocalidad?', MASTER, { ...ctx, bank: null })).toBe(OFFLINE_FALLBACK);
  });

  it('sabe que es un H-Medios que, con IA, es Co-Mediador de los H-Mediadores y de la comunidad', () => {
    const ctx = { tool: 'portal' as const, bank, random: () => 0 };
    const eres = offlineAnswer('¿Qué eres en el modelo heutagógico unadista?', MASTER, ctx);
    expect(eres).toMatch(/H-Medios/);
    expect(eres).toMatch(/Co-Mediador/);
    expect(eres).toMatch(/H-Mediadores/);
    expect(offlineAnswer('¿Qué es un Co-Mediador?', MASTER, ctx)).toMatch(/comunidad unadista/);
    expect(offlineAnswer('¿Reemplazas al docente o al mediador?', MASTER, ctx)).toMatch(/Nunca/);
  });

  it('explica su nombre y por qué es un perro y no un humano, un humanoide ni un robot', () => {
    const ctx = { tool: 'portal' as const, bank, random: () => 0 };
    const nombre = offlineAnswer('¿Qué significa ZOE?', MASTER, ctx);
    expect(nombre).toMatch(/Zona de Oportunidades Estratégicas/);
    expect(nombre).toMatch(/ZOE es vida/);
    expect(nombre).toMatch(/vida a las oportunidades/);
    expect(nombre).toMatch(/ideas e innovaciones/);
    expect(nombre).toMatch(/principio vital/);
    expect(nombre).toMatch(/bios/);
    expect(nombre).toMatch(/significado oficial/);
    expect(nombre).not.toMatch(/no una sigla oficial/);
    expect(nombre).toMatch(/vida/);

    // Variantes de la pregunta del nombre
    expect(offlineAnswer('¿Qué significa tu nombre?', MASTER, ctx)).toMatch(/Zona de Oportunidades Estratégicas/);
    expect(offlineAnswer('¿Por qué te llamas ZOE?', MASTER, ctx)).toMatch(/Zona de Oportunidades Estratégicas/);

    const humano = offlineAnswer('¿Por qué no eres un humano o un humanoide?', MASTER, ctx);
    expect(humano).toMatch(/validación humana/);
    expect(offlineAnswer('¿Por qué no eres un robot?', MASTER, ctx)).toMatch(/acompañar/);
    expect(offlineAnswer('¿Por qué no eres robot?', MASTER, ctx)).toMatch(/acompañar/);
    expect(offlineAnswer('¿Por qué un perro?', MASTER, ctx)).toMatch(/olfato/);
    // El respaldo separa lo institucional de las razones de diseño.
    expect(MASTER).not.toMatch(/Las razones sobre la figura del perro/);
  });

  it('los chistes se ofrecen con permiso, solo en la charla, y después vuelve al trabajo con tacto', () => {
    const work = { studyBlocks: 12, studyIssues: 0, hasProposal: false, prototypes: [] as string[], municipality: 'Sogamoso', department: 'Boyacá' };
    const ctx = { tool: 'portal' as const, bank, random: () => 0 };
    // En una charla sin trabajo, ofrece (pide permiso, no lo cuenta).
    const oferta = offlineAnswer('¿Cómo estás?', MASTER, ctx);
    expect(oferta).toMatch(/chiste\?/);
    expect(oferta).not.toMatch(/Ácido|bus|rojo|techo/i);
    // En lo serio (con trabajo, o en el taller o el recorrido) no propone nada.
    expect(offlineAnswer('¿Cómo estás?', MASTER, { ...ctx, work })).not.toMatch(/chiste/);
    expect(offlineAnswer('¿Cómo estás?', MASTER, { ...ctx, quiet: true })).not.toMatch(/chiste/);
    // Si dijo «¿te cuento un chiste?», el sí lo cuenta y vuelve al trabajo; el no se acepta con cariño.
    const si = offlineAnswer('sí, cuéntalo', MASTER, { ...ctx, lastZoe: oferta });
    expect(si).toMatch(/retomamos|a lo nuestro|volvemos al trabajo/);
    expect(si.length).toBeGreaterThan(60);
    expect(offlineAnswer('no, gracias', MASTER, { ...ctx, lastZoe: oferta })).toMatch(/sin problema|no hay chiste/i);
    // Si lo pidieron en pleno trabajo, lo cuenta y vuelve con tacto.
    expect(offlineAnswer('cuéntame un chiste', MASTER, { ...ctx, work })).toMatch(/retomamos|a lo nuestro|volvemos al trabajo/);
    // Las reglas de la sección no se confunden con chistes.
    const chistes = MASTER.split('## 12. Chistes')[1].split('## 13.')[0];
    expect(chistes).toMatch(/Regla 1\./);
    expect(chistes.split(/\r?\n/).filter((l) => l.startsWith('- ')).every((l) => !/Regla/.test(l))).toBe(true);
  });

  it('trae los chistes nuevos en su sección de chistes', () => {
    const chistes = MASTER.split('## 12. Chistes')[1].split('## 13.')[0];
    for (const c of ['Ácido un placer', 'El ex-preso', 'Nos vemos en el bus', 'me pongo rojo', 'Techo de menos', 'Nada.']) expect(chistes).toContain(c);
    expect(offlineAnswer('cuéntame un chiste', MASTER, { tool: 'portal' as const, bank, random: () => 0.99 })).toMatch(/Nada\.|wifi|ternura|Radar|olfato|ladro|FODA|iterativo|paseo|placer|bit|semáforo|techo|café|rojo|pez|persigo/);
  });

  it('sabe dónde aparecen los líderes en el modelo y qué papel tienen frente a la IA', () => {
    const ctx = { tool: 'portal' as const, bank, random: () => 0 };
    const donde = offlineAnswer('¿Dónde aparecen los líderes en el modelo heutagógico unadista?', MASTER, ctx);
    expect(donde).toMatch(/H-Mediador PRISMA/);
    expect(donde).toMatch(/Encuentros de Líderes Unadistas/);
    expect(offlineAnswer('¿Qué es el liderazgo transformador?', MASTER, ctx)).toMatch(/ética y solidaria/);
    expect(offlineAnswer('¿Qué son los Encuentros de Líderes Unadistas?', MASTER, ctx)).toMatch(/reflexión y despliegue/);
    expect(offlineAnswer('¿Qué papel tiene el líder frente a la inteligencia artificial?', MASTER, ctx)).toMatch(/validación humana del líder/);
    expect(offlineAnswer('¿Cómo acompañas a los líderes unadistas?', MASTER, ctx)).toMatch(/Co-Mediador/);
  });

  it('conoce los trece H del modelo y cómo se relaciona con cada uno', () => {
    const ctx = { tool: 'portal' as const, bank, random: () => 0 };
    const todos = [
      'H-Metacurrículo',
      'H-Estudiante',
      'H-Mediador PRISMA',
      'H-Comunidad',
      'H-Mediaciones',
      'H-Medios',
      'H-Evaluación',
      'H-Inclusión multidimensional',
      'H-Internacionalización transistémica',
      'H-Investigación y creación sostenible-sustentable',
      'H-Innovación y Emprendimiento para la Competitividad Asociativa y Solidaria',
      'H-Calidad holística',
      'H-Bienestar integral',
    ];
    const lista = offlineAnswer('¿Cuáles son los H del modelo heutagógico unadista?', MASTER, ctx);
    for (const h of todos) expect(lista).toContain(h);
    for (const h of todos) {
      expect(MASTER).toContain(`**¿Cómo te relacionas con ${h}?**`);
      const respuesta = offlineAnswer(`¿Cómo te relacionas con ${h}?`, MASTER, ctx);
      expect(respuesta).not.toBe(OFFLINE_FALLBACK);
    }
  });
});
