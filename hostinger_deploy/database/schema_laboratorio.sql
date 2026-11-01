-- ==============================================================================
-- LABORATORIO DIGITAL DE INNOVACIÓN — INNOVAHUB360
-- Esquema de Base de Datos MySQL para Hostinger (hPanel / phpMyAdmin)
-- ==============================================================================
-- REGLAS DE COMPATIBILIDAD HOSTINGER:
-- 1. NO contiene CREATE DATABASE ni DROP DATABASE (la base se crea desde hPanel).
-- 2. NO contiene comandos con privilegios SUPER (como GRANT ALL PRIVILEGES).
-- 3. NO contiene DEFINER, PROCEDURE ni TRIGGER.
-- 4. Todos los nombres de tablas y columnas están en minúsculas (snake_case).
-- 5. Codificación estándar: utf8mb4 con cotejamiento utf8mb4_unicode_ci.
-- ==============================================================================

-- 1. Radar de Innovación: Señales y Macrotendencias
CREATE TABLE IF NOT EXISTS lab_radar_senales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  area VARCHAR(100) NOT NULL,
  horizonte VARCHAR(50) NOT NULL, -- Corto plazo (H1), Mediano plazo (H2), Largo plazo (H3)
  alcance VARCHAR(50) NOT NULL,   -- Internacional, Nacional, Territorial
  madurez VARCHAR(50) DEFAULT 'Temprana',
  impacto_territorial INT NOT NULL DEFAULT 50, -- 0 a 100
  velocidad_adopcion INT NOT NULL DEFAULT 50,  -- 0 a 100
  nivel_evidencia VARCHAR(20) DEFAULT 'Media', -- Alta, Media, Baja
  descripcion TEXT,
  oportunidades TEXT,
  riesgos TEXT,
  recomendacion TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_radar_area (area),
  INDEX idx_radar_horizonte (horizonte),
  INDEX idx_radar_alcance (alcance)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Estudio Territorial: Diagnóstico y Caracterización en 12 Bloques
CREATE TABLE IF NOT EXISTS lab_estudio_territorial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zona_unad VARCHAR(150) NOT NULL,
  municipio VARCHAR(150) NOT NULL,
  departamento VARCHAR(150) NOT NULL,
  codigo_divipola VARCHAR(20) DEFAULT NULL,
  bloque_num INT NOT NULL, -- 1 a 12
  bloque_titulo VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  contenido_markdown LONGTEXT,
  estado VARCHAR(30) DEFAULT 'completado', -- pendiente, en_progreso, completado
  fuentes_json JSON DEFAULT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_estudio_zona_bloque (zona_unad(80), municipio(80), bloque_num),
  INDEX idx_estudio_zona (zona_unad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ideación Estratégica y Elección del Tema
CREATE TABLE IF NOT EXISTS lab_ideacion_estrategica (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tema_titulo VARCHAR(255) NOT NULL,
  enfoque VARCHAR(150) NOT NULL,
  descripcion TEXT NOT NULL,
  fortalezas_json JSON DEFAULT NULL,
  impacto_score INT NOT NULL DEFAULT 85,
  factibilidad_score INT NOT NULL DEFAULT 80,
  es_seleccionado TINYINT(1) NOT NULL DEFAULT 0,
  origen VARCHAR(50) DEFAULT 'territorio', -- territorio, usuario, sugerido_ia
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ideacion_seleccionado (es_seleccionado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Árbol de Innovación: Nodos (Suelo, Raíces, Tronco, Ramas 10-5-3, Frutos)
CREATE TABLE IF NOT EXISTS lab_arbol_nodos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE, -- SU-01, RZ-01, TR-01, TG-01, TN-01, TT-01, FR-01
  nivel VARCHAR(30) NOT NULL,         -- suelo, raiz, tronco, global, nacional, territorial, fruto
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  evidencia VARCHAR(10) NOT NULL DEFAULT 'N1', -- N1 observatorio, N2 contrastada, N3 hipótesis
  tipo_fruto VARCHAR(30) DEFAULT NULL,         -- proyecto, servicio, prototipo
  solucion TEXT DEFAULT NULL,
  impacto_esperado TEXT DEFAULT NULL,
  metricas_json JSON DEFAULT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_arbol_nivel (nivel),
  INDEX idx_arbol_tipo_fruto (tipo_fruto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Árbol de Innovación: Relaciones del Circuito Holográfico (Ascendencia y Descendencia)
CREATE TABLE IF NOT EXISTS lab_arbol_relaciones (
  desde_codigo VARCHAR(30) NOT NULL,
  hacia_codigo VARCHAR(30) NOT NULL,
  tipo_relacion VARCHAR(30) NOT NULL DEFAULT 'deriva_de', -- deriva_de, habilita, riesgo_de
  PRIMARY KEY (desde_codigo, hacia_codigo, tipo_relacion),
  INDEX idx_rel_desde (desde_codigo),
  INDEX idx_rel_hacia (hacia_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Prototipado: Banco de Prototipos, Servicios y Proyectos
CREATE TABLE IF NOT EXISTS lab_prototipos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_fruto VARCHAR(30) DEFAULT NULL, -- FR-01, FR-02 (o NULL si es independiente)
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(60) NOT NULL,        -- Prototipo Tecnológico, Servicio de Innovación, Proyecto Territorial
  publico_objetivo TEXT,
  problema_resuelto TEXT NOT NULL,
  solucion TEXT NOT NULL,
  entregables_json JSON DEFAULT NULL,
  duracion_semanas INT NOT NULL DEFAULT 6,
  escuela_unad VARCHAR(100) DEFAULT 'ECBTI',
  metricas_validacion_json JSON DEFAULT NULL,
  estado VARCHAR(30) DEFAULT 'en_diseno', -- en_diseno, validado, en_piloto
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_proto_categoria (categoria),
  INDEX idx_proto_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Sesiones y Estados Guardados del Laboratorio
CREATE TABLE IF NOT EXISTS lab_sesiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave_sesion VARCHAR(128) NOT NULL UNIQUE,
  estado_json LONGTEXT NOT NULL,
  tema_activo VARCHAR(255) DEFAULT NULL,
  ip_origen VARCHAR(45) DEFAULT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sesion_clave (clave_sesion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
