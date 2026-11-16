import { describe, expect, it } from 'vitest';
import { safeHref } from '@/lib/safeHref';

describe('enlaces de los informes', () => {
  it('solo deja pasar enlaces web y de correo', () => {
    expect(safeHref('https://unad.edu.co/x?y=1')).toBe('https://unad.edu.co/x?y=1');
    expect(safeHref(' http://ejemplo.org ')).toBe('http://ejemplo.org');
    expect(safeHref('mailto:alguien@unad.edu.co')).toBe('mailto:alguien@unad.edu.co');
  });

  it('descarta los que ejecutan código o cargan datos', () => {
    for (const malo of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:x', 'file:///c:/x', '//otro.sitio', '', undefined, null]) {
      expect(safeHref(malo as string), String(malo)).toBeNull();
    }
  });
});
