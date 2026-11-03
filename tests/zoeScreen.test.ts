import { describe, expect, it } from 'vitest';
import { bestOption, describeControls, isRisky, parseAgentReply } from '@/lib/zoeScreen';
import { isConfirmation } from '@/lib/zoeContext';

describe('las manos de ZOE', () => {
  it('lee la respuesta de la IA con lo que dice y lo que hace', () => {
    const reply = parseAgentReply(
      '```json\n{"decir": "Te escribo el tema y armo el árbol.", "acciones": [{"hacer": "escribir", "id": "c1", "texto": "Café especial"}, {"hacer": "presionar", "id": "b2"}], "seguir": false}\n```',
    );
    expect(reply.decir).toBe('Te escribo el tema y armo el árbol.');
    expect(reply.acciones).toEqual([
      { hacer: 'escribir', id: 'c1', texto: 'Café especial' },
      { hacer: 'presionar', id: 'b2' },
    ]);
    expect(reply.seguir).toBe(false);
  });

  it('descarta acciones inválidas y una pantalla que no existe', () => {
    const reply = parseAgentReply(
      '{"decir": "Vamos.", "acciones": [{"hacer": "ir", "herramienta": "cocina"}, {"hacer": "volar"}, {"hacer": "ir", "herramienta": "arbol"}], "seguir": true}',
    );
    expect(reply.acciones).toEqual([{ hacer: 'ir', herramienta: 'arbol' }]);
    expect(reply.seguir).toBe(true);
  });

  it('si la IA responde texto suelto, lo dice y no hace nada; nunca lee JSON en voz alta', () => {
    expect(parseAgentReply('¡Hola! Soy ZOE.')).toEqual({ decir: '¡Hola! Soy ZOE.', acciones: [], seguir: false });
    expect(parseAgentReply('{"decir": "Claro, te ayudo", "acciones": [ {roto').decir).toBe('Claro, te ayudo');
  });

  it('encuentra la opción dicha aunque falten tildes o mayúsculas', () => {
    const deptos = ['Antioquia', 'Bogotá D.C.', 'Huila', 'Nariño', 'Valle del Cauca'];
    expect(bestOption(deptos, 'huila')).toBe(2);
    expect(bestOption(deptos, 'Narino')).toBe(3);
    expect(bestOption(deptos, 'valle')).toBe(4);
    expect(bestOption(deptos, 'Bogota')).toBe(1);
    expect(bestOption(deptos, 'Amazonas')).toBe(-1);
  });

  it('pide confirmación antes de borrar, limpiar o eliminar', () => {
    expect(isRisky('Limpiar')).toBe(true);
    expect(isRisky('Eliminar del Banco')).toBe(true);
    expect(isRisky('Cerrar sesión')).toBe(true);
    expect(isRisky('Generar árbol')).toBe(false);
    expect(isRisky('Descargar informe en Word')).toBe(false);
  });

  it('entiende el sí y el no de la confirmación', () => {
    expect(isConfirmation('sí, dale')).toBe(true);
    expect(isConfirmation('Zoe, hazlo')).toBe(true);
    expect(isConfirmation('no, mejor no')).toBe(false);
    expect(isConfirmation('cancela')).toBe(false);
    expect(isConfirmation('¿qué es un fruto?')).toBeNull();
  });

  it('describe la pantalla en pocas líneas para la IA', () => {
    const text = describeControls([
      { id: 'c1', kind: 'texto', label: 'Tema central', value: '' },
      { id: 'c2', kind: 'lista', label: 'Departamento', value: 'Huila', options: ['Huila', 'Tolima'], optionCount: 32 },
      { id: 'b1', kind: 'boton', label: 'Generar árbol', disabled: true },
    ]);
    expect(text).toContain('c1 · texto · «Tema central» · vacío');
    expect(text).toContain('opciones: Huila, Tolima y 30 más (di el nombre)');
    expect(text).toContain('b1 · boton · «Generar árbol» · desactivado');
  });
});
