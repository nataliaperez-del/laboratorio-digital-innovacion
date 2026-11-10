import { describe, expect, it } from 'vitest';
import { isAdminEmail, parseEmailList, roleOf } from '@/lib/roles';

const ADMINS = 'natalia.perez@unad.edu.co, Camilo.Solano@unad.edu.co';

describe('roles del Laboratorio', () => {
  it('reconoce solo a los dos administradores, sin importar mayúsculas ni espacios', () => {
    expect(isAdminEmail('natalia.perez@unad.edu.co', ADMINS)).toBe(true);
    expect(isAdminEmail('  CAMILO.SOLANO@unad.edu.co ', ADMINS)).toBe(true);
    expect(roleOf('natalia.perez@unad.edu.co', ADMINS)).toBe('admin');
  });

  it('cualquier otra cuenta es usuario', () => {
    expect(roleOf('otra.persona@unad.edu.co', ADMINS)).toBe('user');
    expect(roleOf('natalia.perez@gmail.com', ADMINS)).toBe('user');
    expect(roleOf('natalia.perez@unad.edu.co.falso.com', ADMINS)).toBe('user');
  });

  it('sin lista o sin correo nadie es administrador', () => {
    expect(roleOf('natalia.perez@unad.edu.co', '')).toBe('user');
    expect(roleOf('natalia.perez@unad.edu.co', undefined)).toBe('user');
    expect(roleOf(null, ADMINS)).toBe('user');
    expect(roleOf('', ADMINS)).toBe('user');
  });

  it('la lista admite coma, punto y coma y espacios', () => {
    expect(parseEmailList('a@x.co;b@x.co  c@x.co,')).toEqual(['a@x.co', 'b@x.co', 'c@x.co']);
  });
});
