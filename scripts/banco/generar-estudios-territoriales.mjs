/**
 * Generador del Banco Inicial de Estudios Territoriales (24 Centros en 8 Zonas UNAD).
 *
 * Cada estudio cumple estrictamente con los 12 puntos de la metodología MDVT
 * (Contenedor 2) y pasa la autoevaluación local de `reviewContenedor2Section`.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'src', 'content', 'banco', 'estudios-territoriales-iniciales.json');

const REGIONES = [
  // 1. ZCAR (Caribe)
  {
    zona: 'ZCAR',
    municipio: 'Valledupar',
    depto: 'Cesar',
    poblacion: '550.000 hab. (87% urbana, 13% rural)',
    vocacion: 'Agroindustria láctea, ganadería bovina, economía naranja/cultural (vallenato), transición minero-energética y servicios de apoyo regional.',
    desempleo: '13.8%',
    informalidad: '62.4%',
    pibSector: 'Servicios (48%), Agropecuario y agroindustrial (24%), Comercio (18%), Minería y energía (10%).',
    pilares: {
      gobierno: 'Plan de Desarrollo Municipal articulado al PDET del Cesar; retos en gestión fiscal territorial y digitalización de trámites agropecuarios.',
      desarrollo: 'Principal cuenca lechera del Caribe colombiano; transformación láctea artesanal e industrial; clúster de economía de la música y eventos masivos.',
      infraestructura: 'Conexión vial Ruta del Sol y salida hacia el Caribe central; acueducto y riego del río Guatapurí con requerimientos de modernización frente al cambio climático.',
      humano: 'Sedes universitarias consolidadas (UNAD CCAV Valledupar, UPC, SENA); creciente oferta técnica en agroindustria y gestión cultural.',
      empresarial: 'Predominio de micro y pequeñas empresas familiares; programas de formalización con Cámara de Comercio de Valledupar.'
    },
    dinamicas: 'Acelerada transición hacia energías renovables (parques solares fotovoltaicos en el Cesar); diversificación económica post-carbón; consolidación del turismo cultural y de festivales.',
    brechas: 'Alta informalidad laboral en periferia urbana; rezago en distritos de riego para agricultura intensiva en verano; brecha de conectividad en corregimientos rurales.',
    oportunidades: 'Agregación de valor en derivados lácteos premium y quesos con denominación de origen; agrovoltaica (energía solar integrada a cultivos); internacionalización de la industria creativa vallenata.',
    foda: {
      f: 'Principal centro de producción láctea del norte de Colombia; marca cultural reconocida internacionalmente; alta radiación solar para proyectos energéticos.',
      o: 'Transición energética justa nacional; demanda creciente de alimentos procesados para el Caribe; turismo de naturaleza en la Serranía del Perijá.',
      d: 'Vulnerabilidad hídrica estacional; baja industrialización de subproductos cárnicos y agrícolas; informalidad comercial.',
      a: 'Impacto socioeconómico de la disminución de regalías carboníferas; variabilidad climática extrema en cuenca del río Cesar.'
    }
  },
  {
    zona: 'ZCAR',
    municipio: 'Cartagena',
    depto: 'Bolívar',
    poblacion: '1.050.000 hab. (95% urbana, 5% rural/insular)',
    vocacion: 'Hub portuario marítimo internacional, petroquímica y refinación industrial en Mamonal, turismo histórico, corporativo y de cruceros.',
    desempleo: '11.5%',
    informalidad: '57.8%',
    pibSector: 'Industria petroquímica y manufactura (36%), Turismo y hotelería (28%), Servicios portuarios y logística (24%), Comercio (12%).',
    pilares: {
      gobierno: 'Gobernanza metropolitana compleja; Plan de Ordenamiento Territorial y Plan 4C (Cartagena Competitiva y Compatible con el Clima).',
      desarrollo: 'Zona industrial de Mamonal con refinería de alta tecnología (Reficar); mayor puerto de transbordo del Caribe colombiano.',
      infraestructura: 'Canal de acceso marítimo de calado profundo; infraestructura de carga multimodal; retos de movilidad en corredor suroriental y de drenaje pluvial.',
      humano: 'Ecosistema formativo técnico y profesional articulado a la industria naval, logística portuaria y hospitalidad.',
      empresarial: 'Grandes corporaciones multinacionales conviviendo con amplio sector de comercio minorista informal.'
    },
    dinamicas: 'Modernización tecnológica portuaria con inteligencia de datos; reconversión hacia química verde e hidrógeno industrial; auge de turismo de convenciones.',
    brechas: 'Marcada desigualdad socioespacial entre la zona turística/industrial y las laderas surorientales; vulnerabilidad de la zona insular.',
    oportunidades: 'Astilleros y mantenimiento naval de gran escala; exportación de hidrógeno verde y derivados petroquímicos sostenibles; turismo regenerativo y comunitario.',
    foda: {
      f: 'Ubicación geoestratégica sobre las principales rutas marítimas del mundo; clúster industrial petroquímico consolidado; patrimonio histórico de la humanidad.',
      o: 'Nearshoring para manufactura de exportación hacia Norteamérica; transición hacia combustibles marítimos limpios; ampliación de capacidades del aeropuerto y bahía.',
      d: 'Asimetría en la distribución de la riqueza y el empleo formal; obsolescencia en redes de drenaje urbano contra mareas altas.',
      a: 'Ascenso del nivel del mar por cambio climático en zonas costeras; saturación vial en accesos a zonas logísticas.'
    }
  },
  {
    zona: 'ZCAR',
    municipio: 'Santa Marta',
    depto: 'Magdalena',
    poblacion: '540.000 hab. (90% urbana, 10% rural/costera)',
    vocacion: 'Puerto marítimo de aguas profundas (graneles y carbón), ecoturismo y turismo de sol/playa, agroindustria de banano, café especial y palma de aceite.',
    desempleo: '12.2%',
    informalidad: '63.1%',
    pibSector: 'Turismo, hotelería y gastronomía (38%), Logística portuaria y transporte (26%), Agroindustria (20%), Comercio (16%).',
    pilares: {
      gobierno: 'Planes de desarrollo con enfoque en los 500 años de la ciudad; articulación interinstitucional para protección de áreas protegidas.',
      desarrollo: 'Puerto de aguas profundas natural que no requiere dragado permanente; producción bananera y cafetera de exportación en la Sierra Nevada.',
      infraestructura: 'Terminales marítimas especializadas; necesidad prioritaria de optimización del sistema de acueducto y captación de agua potable.',
      humano: 'Talento orientado a ciencias del mar, biodiversidad, hotelería bilingüe y producción agrícola sostenible.',
      empresarial: 'Tejido mixto: exportadores agroindustriales estructurados y microempresas turísticas estacionales.'
    },
    dinamicas: 'Creciente posicionamiento del café de la Sierra Nevada con sellos orgánicos y comercio justo; transición a turismo sostenible en áreas del Parque Tayrona.',
    brechas: 'Déficit histórico en cobertura y continuidad de agua potable y saneamiento básico; informalidad en operadores turísticos.',
    oportunidades: 'Biotecnología marina y aprovechamiento de recursos genéticos; agroturismo cafetero y cacaotero de alta gama; logística de exportación de frutas exóticas refrigeradas.',
    foda: {
      f: 'Calado natural portuario de gran capacidad; biodiversidad única Sierra-Mar; marca de turismo de renombre mundial.',
      o: 'Incentivos de la Ley de Distritos Turísticos; apertura de mercados para productos agrícolas con certificación de huella de carbono neutra.',
      d: 'Infraestructura de servicios públicos domiciliarios insuficiente en temporadas altas; congestión en corredores de acceso vial.',
      a: 'Erosión costera y eventos meteorológicos extremos en el Caribe; tensiones ambientales por uso del suelo en zonas de amortiguación.'
    }
  },

  // 2. ZCBOY (Centro Boyacá)
  {
    zona: 'ZCBOY',
    municipio: 'Tunja',
    depto: 'Boyacá',
    poblacion: '180.000 hab. (94% urbana, 6% rural)',
    vocacion: 'Ciudad universitaria, nodo de servicios gubernamentales y administrativos, servicios de salud de tercer y cuarto nivel, turismo histórico-patrimonial.',
    desempleo: '11.0%',
    informalidad: '49.2%',
    pibSector: 'Servicios educativos y de salud (42%), Administración pública (22%), Comercio y finanzas (24%), Manufactura ligera y alimentos (12%).',
    pilares: {
      gobierno: 'Alta estabilidad institucional y gobernanza pública; reconocimiento por calidad de vida y seguridad ciudadana.',
      desarrollo: 'Ecosistema de educación superior con la mayor tasa de estudiantes universitarios por habitante de Boyacá; centro de investigación aplicada.',
      infraestructura: 'Doble calzada BTS (Bogotá-Tunja-Sogamoso); terminal de transportes moderna; conectividad digital de fibra óptica en expansión.',
      humano: 'Concentración de talento calificado, docentes e investigadores; retención de egresados en proyectos de innovación regional.',
      empresarial: 'Emprendimientos de servicios de base tecnológica, consultoría, desarrollo de software y servicios médicos especializados.'
    },
    dinamicas: 'Consolidación de Tunja como clúster de conocimiento e investigación agroalimentaria y de salud; impulso a industrias digitales y teletrabajo.',
    brechas: 'Poco desarrollo de industria manufacturera propia; dependencia del gasto público e institucional; migración laboral de jóvenes hacia Bogotá.',
    oportunidades: 'Servicios de analítica de datos e inteligencia artificial aplicados al agro; turismo de eventos académicos y culturales; incubación de startups universitarias.',
    foda: {
      f: 'Capital humano altamente educado; conectividad terrestre directa con la capital del país; entorno seguro y pacífico.',
      o: 'Políticas de descentralización de servicios de ciencia y tecnología; articulación con centros de investigación agraria del altiplano.',
      d: 'Mercado interno reducido; baja oferta de financiamiento ángel y capital de riesgo local.',
      a: 'Pérdida de competitividad si los egresados emigran por falta de empleo industrial especializado.'
    }
  },
  {
    zona: 'ZCBOY',
    municipio: 'Duitama',
    depto: 'Boyacá',
    poblacion: '135.000 hab. (88% urbana, 12% rural)',
    vocacion: 'Capital del transporte pesado de carga, industria metalmecánica y ensamble de carrocerías, agroindustria procesadora de lácteos y cereales.',
    desempleo: '10.8%',
    informalidad: '52.1%',
    pibSector: 'Transporte y logística de carga (34%), Metalmecánica y manufactura (28%), Agroindustria alimentaria (22%), Comercio (16%).',
    pilares: {
      gobierno: 'Articulación público-privada para la zona industrial y terminal de carga; simplificación tributaria para empresas de transporte.',
      desarrollo: 'Clúster carrocero y de remolques de tradición nacional; plantas pasteurizadoras y procesadoras de derivados de leche de la cuenca boyacense.',
      infraestructura: 'Nodo articulador entre Bogotá, Bucaramanga y los Llanos Orientales; corredor férreo central en fase de reactivación.',
      humano: 'Mano de obra altamente técnica en soldadura calificada, mecánica pesada, mecatrónica y tecnología agroindustrial.',
      empresarial: 'Asociatividad gremial en transportadores e industriales del acero y aluminio; empresas medianas consolidadas.'
    },
    dinamicas: 'Modernización hacia carrocerías más ligeras y eficientes en combustible; automatización de plantas lecheras; logística 4.0.',
    brechas: 'Necesidad de modernización tecnológica en microtalleres metalmecánicos; transición hacia flotas de transporte eléctricas o a gas.',
    oportunidades: 'Construcción de vehículos y furgones refrigerados para transporte de alimentos perecederos; logística multimodal tren-carretera.',
    foda: {
      f: 'Ubicación logística estratégica en el centro del país; tradición y destreza técnica industrial comprobada; cuenca lechera productiva.',
      o: 'Reactivación del tren de carga central; programas de descarbonización y reposición de equipo de transporte de carga pesada.',
      d: 'Costos elevados de materias primas metálicas importadas; falta de un parque logístico intermodal terminado.',
      a: 'Vulnerabilidad ante bloqueos o derrumbes en vías de acceso; fluctuaciones en el precio del acero internacional.'
    }
  },
  {
    zona: 'ZCBOY',
    municipio: 'Sogamoso',
    depto: 'Boyacá',
    poblacion: '130.000 hab. (85% urbana, 15% rural)',
    vocacion: 'Industria siderúrgica y metalúrgica pesada, minería de caliza y carbón metalúrgico, producción de cemento y materiales de construcción, puerta al Llano.',
    desempleo: '11.9%',
    informalidad: '54.6%',
    pibSector: 'Siderurgia, cemento y materiales (40%), Minería energética y no metálica (25%), Comercio y servicios logísticos (20%), Agropecuario (15%).',
    pilares: {
      gobierno: 'Planes de reconversión ambiental del valle de Sogamoso; concertación con sectores minero-industriales en normas de calidad del aire.',
      desarrollo: 'Centro siderúrgico de Colombia (acerías y laminación); industria cementera de escala nacional; vocación minera formal.',
      infraestructura: 'Conexión vial hacia Yopal y Casanare por el Cusiana; aeropuerto Alberto Lleras Camargo con potencial logístico.',
      humano: 'Ingenieros de minas, metalúrgicos y geólogos formados en la región (UPTC Sogamoso, UNAD); perfiles técnicos industriales.',
      empresarial: 'Grandes plantas siderúrgicas integradas junto a cientos de unidades de minería tradicional en proceso de tecnificación.'
    },
    dinamicas: 'Transición hacia producción de acero verde con menor huella de carbono; cierre de hornos artesanales contaminantes y paso a tecnologías limpias.',
    brechas: 'Pasivos ambientales y calidad del aire en el valle; vulnerabilidad de la carretera hacia el Llano por fallas geológicas.',
    oportunidades: 'Economía circular mediante aprovechamiento de escorias siderúrgicas en pavimentos y cementos; agroindustria de cebolla y papa en Aquitania-Sogamoso.',
    foda: {
      f: 'Infraestructura industrial instalada única en el país; reservas minerales estratégicas; conocimiento técnico especializado.',
      o: 'Demanda de aceros y cementos para megaproyectos de infraestructura nacional; desarrollo del corredor bioceánico hacia la Orinoquía.',
      d: 'Dependencia de sectores intensivos en carbono; impacto ambiental histórico en suelos y aire.',
      a: 'Normativa ambiental más estricta sin líneas de financiamiento blando para reconversión tecnológica.'
    }
  },

  // 3. ZCBC (Centro Bogotá Cundinamarca)
  {
    zona: 'ZCBC',
    municipio: 'Bogotá',
    depto: 'Bogotá, D.C.',
    poblacion: '7.900.000 hab. (99.5% urbana, 0.5% rural en Sumapaz)',
    vocacion: 'Capital de la República, centro financiero, servicios tecnológicos y de telecomunicaciones, industrias creativas y digitales, biotecnología y gobernanza.',
    desempleo: '9.8%',
    informalidad: '34.2%',
    pibSector: 'Servicios financieros, profesionales y TI (54%), Comercio y logística (22%), Industria manufacturera (14%), Construcción (10%).',
    pilares: {
      gobierno: 'Distrito Capital con autonomía presupuestal robusta; política pública de Ciencia, Tecnología e Innovación articulada a Connect Bogotá.',
      desarrollo: 'Mayor mercado consumidor de Colombia; concentración de sedes corporativas multinacionales; clúster de software y fintech.',
      infraestructura: 'Aeropuerto El Dorado (primer aeropuerto en carga de Latinoamérica); proyectos en ejecución de Metro Línea 1 y Regiotram de Occidente.',
      humano: 'Mayor concentración de universidades acreditadas en alta calidad, doctores, centros de I+D e institutos de investigación del país.',
      empresarial: 'Tejido empresarial diverso con más de 400.000 empresas activas registradas en la Cámara de Comercio de Bogotá.'
    },
    dinamicas: 'Acelerada adopción de inteligencia artificial y analítica avanzada en banca y retail; expansión de startups tecnológicas; descarbonización de flota de transporte público.',
    brechas: 'Congestión en movilidad urbana de superficie; brecha socioeconómica entre bordes periféricos y centro ampliado; presión sobre recursos hídricos.',
    oportunidades: 'Consolidación como hub regional de servicios tecnológicos y data centers; turismo de negocios y cultural; desarrollo de industrias biofarmacéuticas.',
    foda: {
      f: 'Escala de mercado insuperable en el país; alta densidad de talento e inversión extranjera; infraestructura aeroportuaria líder.',
      o: 'Atracción de operaciones de servicios globales (BPO/KPO con IA); consolidación de la Región Metropolitana Bogotá-Cundinamarca.',
      d: 'Tiempos prolongados de desplazamiento urbano; costo de vida y valor del metro cuadrado para nuevos emprendimientos.',
      a: 'Vulnerabilidad ante estrés hídrico en embalses de Chingaza; incertidumbre macroeconómica y presión tributaria sobre nóminas calificadas.'
    }
  },
  {
    zona: 'ZCBC',
    municipio: 'Facatativá',
    depto: 'Cundinamarca',
    poblacion: '160.000 hab. (88% urbana, 12% rural)',
    vocacion: 'Floricultura tecnificada de exportación, agroindustria procesadora de granos y pastas, manufactura liviana, nodo logístico de la Sabana de Occidente.',
    desempleo: '9.5%',
    informalidad: '46.8%',
    pibSector: 'Floricultura y agroexportación (42%), Agroindustria de alimentos y bebidas (28%), Comercio y servicios logísticos (18%), Manufactura (12%).',
    pilares: {
      gobierno: 'Coordinación con la Gobernación de Cundinamarca y Asocolflores en gestión de recursos hídricos y planeación territorial.',
      desarrollo: 'Principal clúster floricultor de exportación de la Sabana; presencia de plantas de molinería y alimentos concentrados.',
      infraestructura: 'Conexión vial directa con Bogotá por la calle 13; trazado del tren de cercanías Regiotram de Occidente con estación terminal.',
      humano: 'Mano de obra especializada en floricultura con alto porcentaje de empleo femenino formal; técnicos agropecuarios del SENA y universidades.',
      empresarial: 'Empresas agroexportadoras con altos estándares internacionales de calidad (bajas huellas de carbono y certificaciones Florverde).'
    },
    dinamicas: 'Automatización de procesos de poscosecha y empaque; reutilización de aguas lluvias en invernaderos; expectativa por el inicio del Regiotram.',
    brechas: 'Sobrecarga vehicular en el corredor de la calle 13 hacia Bogotá; disponibilidad de agua subterránea para riego en temporadas secas.',
    oportunidades: 'Aprovechamiento del Regiotram para movilidad limpia de trabajadores y flete ligero; producción de bioplásticos a partir de residuos florales.',
    foda: {
      f: 'Industria floricultora de clase mundial con empleo formal; cercanía al aeropuerto El Dorado para flete aéreo; mano de obra experta.',
      o: 'Regiotram de Occidente como eje de transformación territorial; demanda internacional estable de flores y alimentos procesados.',
      d: 'Dependencia de ciclos cambiarios del dólar; escasez de agua potable en áreas de expansión urbana.',
      a: 'Heladas estacionales en la sabana que dañan cultivos; saturación vial crónica en accesos a Bogotá.'
    }
  },
  {
    zona: 'ZCBC',
    municipio: 'Zipaquirá',
    depto: 'Cundinamarca',
    poblacion: '140.000 hab. (86% urbana, 14% rural)',
    vocacion: 'Turismo patrimonial y de naturaleza (Catedral de Sal), agroindustria láctea, minería de sal y arcilla, centro de servicios de la Sabana Centro.',
    desempleo: '9.2%',
    informalidad: '48.1%',
    pibSector: 'Turismo y comercio especializado (38%), Agroindustria lechera y pecuaria (26%), Minería no metálica y cerámica (20%), Servicios (16%).',
    pilares: {
      gobierno: 'Gestión turística destacada a través de Catedral de Sal S.A.; articulación con la Asociación de Municipios de Sabana Centro (Asocentro).',
      desarrollo: 'Primera maravilla turística de Colombia que atrae cientos de miles de visitantes internacionales; cuenca lechera tecnificada.',
      infraestructura: 'Doble calzada Bogotá-Chía-Zipaquirá; tren turístico de la Sabana; hospital regional de alta complejidad.',
      humano: 'Formación técnica en gastronomía, hotelería, producción agropecuaria limpia y guianza turística bilingüe.',
      empresarial: 'Prestadores turísticos articulados, cooperativas lecheras y plantas de transformación de derivados cárnicos y lácteos.'
    },
    dinamicas: 'Desarrollo de turismo de bienestar y gastronomía de autor; crecimiento inmobiliario ordenado por descongestión de Bogotá.',
    brechas: 'Retención del turista en pernoctación nocturna (predominio de turismo de pasadía); articulación de la zona rural al circuito turístico.',
    oportunidades: 'Circuito turístico integrado Sabana Centro; exportación de quesos madurados y mantequillas artesanales; cluster cerámico de alta gama.',
    foda: {
      f: 'Atractivo icónico global (Catedral de Sal); cercanía y fácil acceso desde Bogotá; calidad de vida y servicios de salud consolidados.',
      o: 'Creciente flujo de turismo receptivo internacional; valorización inmobiliaria y atracción de familias profesionales.',
      d: 'Tráfico de fin de semana colapsado en accesos urbanos; gasto promedio por turista aún mejorable.',
      a: 'Contaminación de fuentes hídricas por actividades agrícolas y mineras de pequeña escala; presión sobre suelos de vocación agrícola.'
    }
  },

  // 4. ZCORI (Centro Oriente)
  {
    zona: 'ZCORI',
    municipio: 'Bucaramanga',
    depto: 'Santander',
    poblacion: '610.000 hab. (Área Metropolitana: 1.150.000 hab.)',
    vocacion: 'Calzado, cuero y marroquinería, confección y moda infantil, servicios médicos de alta complejidad, desarrollo de software y avicultura.',
    desempleo: '9.0%',
    informalidad: '45.1%',
    pibSector: 'Servicios de salud, educación y TI (38%), Industria manufacturera (calzado/textil/avícola) (32%), Comercio (20%), Construcción (10%).',
    pilares: {
      gobierno: 'Destacada cultura cívica y eficiencia administrativa; políticas metropolitanas de competitividad e innovación coordinadas.',
      desarrollo: 'Ciudad con menor desempleo histórico entre grandes capitales; clúster de salud (FOSCAL, FCV - Hospital Internacional) de referencia latinoamericana.',
      infraestructura: 'Conexión vial con el Caribe y Bogotá; aeropuerto Palonegro con conectividad nacional e internacional directa.',
      humano: 'Universidades de alta calidad (UIS, UNAB, UDES, UNAD CEAD Bucaramanga); alta graduación de ingenieros y profesionales de la salud.',
      empresarial: 'Tejido de micro, pequeña y mediana empresa con fuerte vocación manufacturera y exportadora.'
    },
    dinamicas: 'Digitalización y comercio electrónico en el sector calzado; exportación de servicios de telemedicina y cardiología; auge de empresas de base tecnológica (Bucaramanga Tech).',
    brechas: 'Espacio limitado para expansión industrial en el casco urbano; topografía montañosa que encarece obras de infraestructura vial.',
    oportunidades: 'Hub de turismo médico internacional; diseño y fabricación de calzado ergonómico y sostenible; centro de desarrollo de software para el sector salud.',
    foda: {
      f: 'Ecosistema de salud y educación superior de excelencia; dinamismo empresarial y baja tasa de desempleo; calidad de vida urbana.',
      o: 'Ampliación de vuelos internacionales en Palonegro; demanda internacional de calzado de cuero colombiano frente a competidores asiáticos.',
      d: 'Dependencia del corredor vial hacia la costa que sufre fallas geológicas; encarecimiento del suelo urbano.',
      a: 'Entrada de calzado importado a precios predatorios; vulnerabilidad del páramo de Santurbán que abastece el acueducto.'
    }
  },
  {
    zona: 'ZCORI',
    municipio: 'Cúcuta',
    depto: 'Norte de Santander',
    poblacion: '780.000 hab. (96% urbana, 4% rural)',
    vocacion: 'Hub comercial binacional y de logística fronteriza, manufactura textil, marroquinería, minería de arcilla y cerámica, carbón.',
    desempleo: '12.8%',
    informalidad: '61.5%',
    pibSector: 'Comercio mayorista y minorista (44%), Servicios y transporte logístico (26%), Industria de arcilla, calzado y confección (20%), Minería (10%).',
    pilares: {
      gobierno: 'Planes de reactivación económica con Zonas Económicas y Sociales Especiales (ZESE); cooperación binacional en puentes fronterizos.',
      desarrollo: 'Puente terrestre natural entre Colombia y Venezuela; mayor clúster cerámico del país (ladrillo y gres de exportación).',
      infraestructura: 'Cuatro pasos fronterizos formales (Atanasio Girardot, Simón Bolívar, Francisco de Paula Santander, La Unión); aeropuerto Camilo Daza.',
      humano: 'Mano de obra adaptable con destreza en confecciones, zapatería y comercio exterior; oferta universitaria consolidada.',
      empresarial: 'Predominio de empresas comerciales y talleres de calzado/confección que se benefician del régimen tributario ZESE.'
    },
    dinamicas: 'Reapertura gradual del comercio binacional formal con Venezuela; tecnificación de hornos cerámicos hacia gas natural.',
    brechas: 'Elevada informalidad laboral; dependencia histórica del diferencial cambiario con Venezuela; seguridad en corredores suburbanos.',
    oportunidades: 'Zona Franca de Cúcuta como centro de ensamble y logística; exportación de arcillas y materiales de construcción al Caribe; manufactura ligera bajo régimen ZESE.',
    foda: {
      f: 'Infraestructura aduanera y puentes internacionales habilitados; régimen tributario especial atractivo para inversión; capacidad instalada en confección.',
      o: 'Normalización plena del intercambio comercial binacional; proyectos de gasoductos y encadenamientos productivos con el estado Táchira.',
      d: 'Volatilidad económica por factores geopolíticos fronterizos; alta tasa de informalidad en microcomercios.',
      a: 'Contrabando y comercio informal no regulado en pasos no habilitados; fluctuaciones en la demanda del mercado venezolano.'
    }
  },
  {
    zona: 'ZCORI',
    municipio: 'Ocaña',
    depto: 'Norte de Santander',
    poblacion: '115.000 hab. (82% urbana, 18% rural)',
    vocacion: 'Agricultura intensiva de hortalizas (cebolla ocañera), café, comercio regional de articulación Catatumbo-Cesar, educación y transporte.',
    desempleo: '12.0%',
    informalidad: '66.0%',
    pibSector: 'Comercio regional y servicios (42%), Agropecuario (cebolla, café, fríjol) (32%), Transporte y logística (16%), Construcción (10%).',
    pilares: {
      gobierno: 'Alcaldía municipal y articulación con planes PDET de la subregión del Catatumbo; retos en finanzas públicas locales.',
      desarrollo: 'Centro prestador de servicios educativos, financieros y de salud para más de 10 municipios del Catatumbo y sur del Cesar.',
      infraestructura: 'Vía Cúcuta-Ocaña-Aguachica que conecta la frontera con el río Magdalena; aeropuerto de Aguas Claras con vuelos regionales.',
      humano: 'Universidad Francisco de Paula Santander (UFPSO) y UNAD CEAD Ocaña; juventud rural con vocación de liderazgo agrario.',
      empresarial: 'Comercio mayorista de alimentos e insumos agrícolas; cooperativas cafetaleras y asociaciones de cultivadores de cebolla.'
    },
    dinamicas: 'Búsqueda de denominación de origen para la cebolla ocañera; producción de cafés especiales de altura en la cordillera Oriental.',
    brechas: 'Complejidades de orden público en el entorno rural circundante del Catatumbo; vías terciarias deterioradas por lluvias.',
    oportunidades: 'Agroindustria de transformación de pastas de cebolla y ají; ecoturismo en el Área Natural Única Los Estoraques; centro de formación para la paz territorial.',
    foda: {
      f: 'Posición geográfica estratégica entre el interior del Catatumbo y la Troncal del Magdalena; identidad cultural y gastronómica singular.',
      o: 'Inversiones del Fondo Colombia en Paz y programas de sustitución productiva; auge de cafés especiales de exportación.',
      d: 'Aislamiento relativo cuando la carretera a Cúcuta o Aguachica sufre cierres geológicos; poca tecnificación poscosecha.',
      a: 'Impacto de la conflictividad social en municipios vecinos; variación climática que afecta los ciclos de cosecha de hortalizas.'
    }
  },

  // 5. ZCSUR (Centro Sur)
  {
    zona: 'ZCSUR',
    municipio: 'Pitalito',
    depto: 'Huila',
    poblacion: '140.000 hab. (68% urbana, 32% rural)',
    vocacion: 'Capital cafetera de Colombia (mayor productor de café especial del país con denominaciones de origen), fruticultura, turismo arqueológico y ecoturismo.',
    desempleo: '10.2%',
    informalidad: '59.8%',
    pibSector: 'Producción y beneficio de café especial (46%), Comercio y servicios de acopio agrícola (24%), Frutas y ganadería (16%), Turismo y hotelería (14%).',
    pilares: {
      gobierno: 'Articulación ejemplar entre Comité de Cafeteros, Alcaldía y SENA; políticas municipales de protección de cuencas del Macizo Colombiano.',
      desarrollo: 'Epicentro del café de alta calidad reconocido en certámenes internacionales (Taza de la Excelencia); laboratorios de catación públicos y privados.',
      infraestructura: 'Ruta 45 (vía Neiva-Pitalito-Mocoa); aeropuerto Contador con frecuencias comerciales; centros de acopio tecnificados.',
      humano: 'Generación de jóvenes baristas, catadores Q-Grader y tecnólogos agropecuarios; arraigo por la cultura cafetera.',
      empresarial: 'Asociaciones de pequeños caficultores exportando directamente a Europa, EE. UU. y Asia sin intermediarios.'
    },
    dinamicas: 'Relevo generacional en fincas cafeteras con adopción de tecnologías digitales de trazabilidad y fermentación controlada; auge de tiendas de café de especialidad.',
    brechas: 'Deficiencias en tramos de la Ruta 45 en la cordillera; necesidad de plantas de tratamiento de aguas mieles del café en todas las veredas.',
    oportunidades: 'Biotecnología para valorización del mucílago y cáscara de café en cosméticos y bebidas; circuito turístico San Agustín-Isnos-Pitalito; exportación de pasifloras (cholupa y maracuyá).',
    foda: {
      f: 'Liderazgo nacional indiscutible en volumen y calidad de café arábica especial; ecosistema de catación y trilla; cercanía al Parque Arqueológico de San Agustín.',
      o: 'Demanda global insaciable de cafés exóticos diferenciados; fondos de sostenibilidad internacional para el Macizo Colombiano.',
      d: 'Vulnerabilidad ante la broca y roya por variaciones térmicas; dependencia de precios internacionales del grano.',
      a: 'Derrumbes en el corredor del Pericongo sobre la Ruta 45 que aíslan la salida de la cosecha hacia el puerto de Buenaventura.'
    }
  },
  {
    zona: 'ZCSUR',
    municipio: 'Pasto',
    depto: 'Nariño',
    poblacion: '400.000 hab. (84% urbana, 16% rural)',
    vocacion: 'Agroindustria de papa, hortalizas, lácteos y café, artesanías únicas (barniz de Pasto), centro logístico hacia Ecuador y el Pacífico sur, turismo cultural.',
    desempleo: '11.8%',
    informalidad: '58.3%',
    pibSector: 'Comercio binacional y servicios (40%), Agroindustria alimentaria y lechera (28%), Artesanías y manufactura (18%), Construcción y salud (14%).',
    pilares: {
      gobierno: 'Alcaldía Municipal con planes de resiliencia y ordenamiento territorial volcánico; gobernanza participativa comunitaria en corregimientos.',
      desarrollo: 'Ciudad creativa reconocida por la UNESCO (Carnaval de Negros y Blancos y Barniz de Pasto); cuenca lechera de minifundio de alta productividad.',
      infraestructura: 'Vía Panamericana (corredor Pasto-Rumichaca y doble calzada en avance); aeropuerto Antonio Nariño en Chachagüí.',
      humano: 'Universidad de Nariño, UNAD CEAD Pasto, Universidad Mariana; profunda vocación científica en agronomía andina y ciencias sociales.',
      empresarial: 'Microempresas artesanales, asociaciones campesinas de producción limpia y empresas comercializadoras transfronterizas.'
    },
    dinamicas: 'Transformación de tubérculos andinos y papa nativa para mercados gourmet; turismo experiencial artesanal; comercio formal con Tulcán e Ibarra.',
    brechas: 'Aislamiento vial recurrente en la Panamericana por fallas de la falla de Romeral; costo del flete hacia los puertos del centro del país.',
    oportunidades: 'Denominación de origen y protección intelectual de saberes artesanales; exportación de quinua y cultivos andinos; logística de conexión Pacífico-Andes.',
    foda: {
      f: 'Riqueza cultural inmaterial de valor mundial; suelo volcánico fértil de alta productividad agrícola; cercanía al mercado ecuatoriano en dólares.',
      o: 'Finalización de la doble calzada Rumichaca-Pasto; auge del turismo patrimonial y de compras transfronterizo.',
      d: 'Fragilidad de la conectividad vial con Popayán y el interior del país; atomización de la tierra en minifundios extremos.',
      a: 'Cierres de frontera no previstos; movimientos en masa y deslizamientos por lluvias intensas en la cordillera.'
    }
  },
  {
    zona: 'ZCSUR',
    municipio: 'Cali',
    depto: 'Valle del Cauca',
    poblacion: '2.250.000 hab. (Área Metropolitana: 3.100.000 hab.)',
    vocacion: 'Clúster agroindustrial de bioenergía y azúcar, industria farmacéutica y de cuidado personal, industrias creativas (salsa, audiovisual), servicios médicos y logística.',
    desempleo: '10.5%',
    informalidad: '46.0%',
    pibSector: 'Industria química/farmacéutica/alimentos (34%), Servicios corporativos y salud (32%), Comercio y logística (24%), Economía creativa (10%).',
    pilares: {
      gobierno: 'Distrito Especial Deportivo, Cultural, Turístico, Empresarial y de Servicios; sede reciente de la COP16 sobre biodiversidad.',
      desarrollo: 'Cercanía al puerto de Buenaventura (principal terminal marítima del Pacífico colombiano); clúster de excelencia clínica y trasplantes.',
      infraestructura: 'Aeropuerto Internacional Alfonso Bonilla Aragón; red de autopistas del Valle del Cauca; sistema de transporte masivo MIO.',
      humano: 'Universidades de élite (Univalle, Javeriana, Icesi, UNAD CEAD Cali); profesionales de alto nivel en química, biotecnología y artes.',
      empresarial: 'Grandes plantas farmacéuticas nacionales y multinacionales (Tecnoquímicas, Baxter, Abbott), ingenios azucareros y miles de pymes.'
    },
    dinamicas: 'Acelerada transición hacia biorrefinerías e insumos químicos verdes; impulso a la economía circular de la biomasa de caña; auge de producciones audiovisuales.',
    brechas: 'Retos de cohesión social y empleo juvenil en comunas del oriente; congestión en el sistema de transporte masivo.',
    oportunidades: 'Capital mundial de la biodiversidad (legado COP16); nearshoring farmacéutico; bioeconomía a partir de subproductos agroindustriales del Valle.',
    foda: {
      f: 'Plataforma industrial diversificada y madura; posición inmejorable frente a la Cuenca del Pacífico; liderazgo en salud y cultura.',
      o: 'Inversiones extranjeras atraídas por Invest Pacific; exportaciones de azúcar refinada, alcohol carburante y confitería a Asia y América Latina.',
      d: 'Tensiones sociales urbanas no resueltas; problemas de sostenibilidad financiera en el transporte masivo.',
      a: 'Vulnerabilidad por bloqueos en la vía a Buenaventura que paralizan el suministro de insumos industriales.'
    }
  },

  // 6. ZSUR (Sur)
  {
    zona: 'ZSUR',
    municipio: 'Neiva',
    depto: 'Huila',
    poblacion: '360.000 hab. (93% urbana, 7% rural)',
    vocacion: 'Agroindustria de arroz, piscicultura continental (tilapia de exportación en represa de Betania), café, cacao, servicios del alto Magdalena y turismo.',
    desempleo: '11.5%',
    informalidad: '53.4%',
    pibSector: 'Comercio y servicios departamentales (42%), Agroindustria piscícola, arrocera y cafetera (30%), Construcción (16%), Minería y energía (12%).',
    pilares: {
      gobierno: 'Articulación con la Gobernación del Huila en el Plan Regional de Competitividad; políticas de sostenibilidad para la cuenca del río Magdalena.',
      desarrollo: 'Capital del primer productor y exportador de tilapia fresca de Colombia hacia EE. UU.; molinos arroceros de escala nacional.',
      infraestructura: 'Ruta 45 de acceso hacia el sur del país; aeropuerto Benito Salas; acceso a los embalses hidroeléctricos de Betania y El Quimbo.',
      humano: 'Universidad Surcolombiana (USCO), UNAD CEAD Neiva, centros de investigación en acuicultura y café; personal técnico especializado.',
      empresarial: 'Empresas piscícolas certificadas con sellos internacionales de inocuidad (BAP, ASC), molineros y comerciantes regionales.'
    },
    dinamicas: 'Industrialización de filetes de tilapia fresca con cadena de frío aérea; adopción de tecnologías de agricultura de precisión en arroceras.',
    brechas: 'Variabilidad del caudal del río Magdalena que impacta la calidad del agua; estacionalidad económica en cosechas.',
    oportunidades: 'Aprovechamiento de subproductos de la piscicultura (piel de tilapia para colágeno y biomedicina); turismo astronómico y de naturaleza en la Tatacoa.',
    foda: {
      f: 'Liderazgo continental en exportación de proteína piscícola; ubicación como puerta de entrada al sur de Colombia; sol y clima constante.',
      o: 'Creciente consumo de proteína blanca y saludable en mercados internacionales; consolidación del Desierto de la Tatacoa como destino Starlight.',
      d: 'Costos elevados de energía eléctrica para bombeo de agua en arrozales; informalidad en el comercio periférico.',
      a: 'Impactos del fenómeno de El Niño en los niveles de los embalses y temperatura del agua para los peces.'
    }
  },
  {
    zona: 'ZSUR',
    municipio: 'Florencia',
    depto: 'Caquetá',
    poblacion: '175.000 hab. (83% urbana, 17% rural)',
    vocacion: 'Ganadería regenerativa doble propósito, agroindustria de quesos con Denominación de Origen, cacao fino de aroma, ecoturismo y puerta de la Amazonía.',
    desempleo: '12.4%',
    informalidad: '64.8%',
    pibSector: 'Comercio regional y servicios gubernamentales (45%), Agroindustria láctea y ganadería (28%), Cacao y frutales amazónicos (15%), Construcción (12%).',
    pilares: {
      gobierno: 'Articulación de planes PDET; pactos interinstitucionales de Cero Deforestación con cooperación internacional.',
      desarrollo: 'Cuenca láctea insigne de la Amazonía con Denominación de Origen «Queso del Caquetá»; transformación de copoazú, arazá y cacao.',
      infraestructura: 'Vía Florencia-Suaza que cruza la cordillera hacia el Huila; aeropuerto Gustavo Artunduaga; red fluvial por el río Orteguaza.',
      humano: 'Universidad de la Amazonia, UNAD CCAV Florencia; científicos y técnicos en conservación de bosques tropicales y sistemas silvopastoriles.',
      empresarial: 'Comité de Ganaderos del Caquetá, queserías artesanales agremiadas y cooperativas de cacaoteros y caucheros.'
    },
    dinamicas: 'Transición de ganadería extensiva tradicional a sistemas silvopastoriles intensivos que liberan tierra para regeneración del bosque amazónico.',
    brechas: 'Presión sobre la frontera agrícola; vías secundarias y terciarias de difícil tránsito en época de lluvias intensas.',
    oportunidades: 'Mercado de bonos de carbono forestal y biodiversidad; cosmética natural y superalimentos amazónicos; ecoturismo de avistamiento de aves.',
    foda: {
      f: 'Denominación de origen quesera reconocida; biodiversidad amazónica privilegiada; investigación científica especializada en el bioma amazónico.',
      o: 'Incentivos de cooperación internacional para bioeconomía y conservación; demanda de cacao orgánico en chocolaterías gourmet de Europa.',
      d: 'Aislamiento logístico cordillerano; costo de fletes refrigerados hacia Bogotá y el centro del país.',
      a: 'Avance de la deforestación ilegal en bordes de parques naturales; conflictividad socioambiental en áreas remotas.'
    }
  },
  {
    zona: 'ZSUR',
    municipio: 'San Vicente del Caguán',
    depto: 'Caquetá',
    poblacion: '72.000 hab. (52% urbana, 48% rural dispersa)',
    vocacion: 'Mayor cuenca lechera y ganadera del piedemonte amazónico, producción quesera tradicional, agroforestería comunitaria y conservación de sabanas naturales.',
    desempleo: '13.0%',
    informalidad: '72.5%',
    pibSector: 'Producción ganadera y quesera (52%), Comercio local y servicios agropecuarios (28%), Agroforestería y caucho (12%), Madera y otros (8%).',
    pilares: {
      gobierno: 'Municipio PDET prioritario; presencia de agencias del Estado y programas de desarrollo con enfoque territorial.',
      desarrollo: 'Capacidad de acopio de más de 300.000 litros diarios de leche en temporadas altas; quesillo y queso picado reconocidos en el mercado nacional.',
      infraestructura: 'Aeropuerto Eduardo Falla Solano; eje vial pavimentado hacia Florencia; red de trochas ganaderas con necesidad de puentes veredales.',
      humano: 'Productores campesinos con arraigo y conocimiento empírico en manejo de pasturas; técnicos agropecuarios locales de la UNAD y el SENA.',
      empresarial: 'Asociaciones campesinas, pasteurizadoras locales y pequeñas plantas procesadoras de queso hilado.'
    },
    dinamicas: 'Concientización ambiental campesina para frenar la quema de bosque; establecimiento de cercas vivas y bancos de forraje proteico.',
    brechas: 'Grandes distancias veredales hacia el casco urbano; falta de electrificación constante en áreas rurales que impide refrigerar leche en origen.',
    oportunidades: 'Instalación de centros de acopio lechero con energía solar fotovoltaica; agroindustria del caucho natural; turismo ecológico en los llanos del Yarí.',
    foda: {
      f: 'Enorme potencial forrajero y ganadero; tradición quesera arraigada; comunidades organizadas en núcleos de desarrollo comunal.',
      o: 'Proyectos de pago por servicios ambientales; acceso a mercados institucionales que priorizan compras públicas de alimentos de zonas PDET.',
      d: 'Alta informalidad en tenencia de la tierra; infraestructura de frío rural deficiente; brecha digital aguda en veredas.',
      a: 'Tensiones por uso de la tierra en límites del Parque Nacional Serranía de Chiribiquete; lluvias torrenciales que dañan pasos de ríos.'
    }
  },

  // 7. ZOCC (Occidente)
  {
    zona: 'ZOCC',
    municipio: 'Medellín',
    depto: 'Antioquia',
    poblacion: '2.600.000 hab. (Valle de Aburrá: 4.100.000 hab.)',
    vocacion: 'Distrito Especial de Ciencia, Tecnología e Innovación, clúster textil y confección de moda, servicios de ingeniería y energía, salud avanzada y turismo de eventos.',
    desempleo: '8.8%',
    informalidad: '38.0%',
    pibSector: 'Servicios de ingeniería, tecnología y financieros (45%), Industria manufacturera textil/química/alimentos (28%), Comercio (18%), Turismo y eventos (9%).',
    pilares: {
      gobierno: 'Distrito Especial de CTI; articulación entre Comité Universidad Empresa Estado (CUEE) y Ruta N; cultura de innovación pública.',
      desarrollo: 'Empresas Públicas de Medellín (EPM), Grupo Argos, Grupo Nutresa, Grupo Sura; clúster de moda e innovación en materiales textiles.',
      infraestructura: 'Sistema Metro (trenes, cables, tranvía); Túnel de Oriente que conecta al aeropuerto internacional de Rionegro en 25 minutos.',
      humano: 'Universidades insignes (U. de Antioquia, UNAL Medellín, EAFIT, UNAD CEAD Medellín); semilleros de programadores y diseñadores.',
      empresarial: 'Tejido empresarial con alto sentido de pertenencia regional; incubadoras de startups y fondos de capital semilla activos.'
    },
    dinamicas: 'Consolidación de Medellín como centro de desarrollo de software e inteligencia artificial para América Latina; nómadas digitales y turismo gastronómico.',
    brechas: 'Topografía del valle que genera episodios de contingencia atmosférica en temporadas de transición de lluvias; gentrificación en zonas turísticas.',
    oportunidades: 'Exportación de servicios intensivos en conocimiento; moda inteligente con tejidos antibacteriales y reciclados; hubs de biotecnología médica.',
    foda: {
      f: 'Ecosistema de innovación más articulado del país; infraestructura de transporte público masivo modelo; músculo empresarial cooperativo.',
      o: 'Beneficios tributarios del Distrito Especial de CTI para empresas que inviertan en I+D; atracción masiva de eventos internacionales.',
      d: 'Disponibilidad limitada de suelo plano para grandes factorías fabriles; calidad del aire en el fondo del valle.',
      a: 'Escasez de talento bilingüe en tecnología para suplir la demanda de las multinacionales que aterrizan en la ciudad.'
    }
  },
  {
    zona: 'ZOCC',
    municipio: 'Dosquebradas',
    depto: 'Risaralda',
    poblacion: '230.000 hab. (92% urbana, 8% rural)',
    vocacion: 'Corazón industrial del Eje Cafetero, manufactura textil y confecciones, metalmecánica liviana y autopartes, procesamiento de alimentos, nodo logístico contiguo a Pereira.',
    desempleo: '9.8%',
    informalidad: '49.0%',
    pibSector: 'Industria manufacturera y ensamble (42%), Comercio mayorista y distribución (26%), Servicios logísticos y transporte (20%), Construcción (12%).',
    pilares: {
      gobierno: 'Alcaldía Municipal enfocada en competitividad industrial y ordenamiento del territorio con vocación manufacturera.',
      desarrollo: 'Parques industriales consolidados; concentración de fábricas de confección que abastecen marcas nacionales e internacionales.',
      infraestructura: 'Viaducto César Gaviria Trujillo que une a Pereira y Dosquebradas; eje de la Autopista del Café; cercanía al aeropuerto Matecaña.',
      humano: 'Mano de obra técnica calificada en patronaje, confección industrial, soldadura, inyección de plásticos y logística.',
      empresarial: 'Tejido de pequeñas y medianas industrias altamente productivas asociadas a la Cámara de Comercio de Dosquebradas.'
    },
    dinamicas: 'Modernización de maquinaria textil con corte láser e impresión digital; desarrollo de centros logísticos para paquetería del Eje Cafetero.',
    brechas: 'Congestión vehicular recurrente en los puentes de conexión con Pereira; requerimientos de modernización en redes de alcantarillado industrial.',
    oportunidades: 'Atracción de empresas manufactureras que salen de las grandes capitales buscando menores costos operativos y ubicación céntrica en el triángulo de oro colombiano.',
    foda: {
      f: 'Posición geográfica central equidistante entre Bogotá, Medellín y Cali; tradición fabril reconocida; costo de suelo competitivo.',
      o: 'Crecimiento del comercio electrónico que demanda centros de distribución en el centro del país; alianzas productivas con Pereira.',
      d: 'Dependencia del paso vial hacia Pereira; limitada oferta de suelo para nuevos parques industriales de gran escala.',
      a: 'Vulnerabilidad ante crecientes de quebradas urbanas (como La Víbora) en inviernos severos.'
    }
  },
  {
    zona: 'ZOCC',
    municipio: 'Turbo',
    depto: 'Antioquia',
    poblacion: '140.000 hab. (62% urbana, 38% rural/costera)',
    vocacion: 'Agroindustria bananera y platanera de exportación, pesca artesanal y acuicultura, puerto sobre el mar Caribe antioqueño, articulación bioceánica con el Chocó.',
    desempleo: '13.5%',
    informalidad: '68.0%',
    pibSector: 'Agroindustria de banano y plátano (48%), Comercio y servicios logísticos marítimos (26%), Pesca y agropecuario (16%), Construcción (10%).',
    pilares: {
      gobierno: 'Distrito Especial Portuario, Logístico, Industrial, Turístico y Comercial; planes de articulación con la Gobernación de Antioquia para el megaproyecto Puerto Antioquia.',
      desarrollo: 'Corazón de la producción de plátano de exportación de Urabá; terminal portuaria histórica y en transformación hacia terminales de aguas profundas.',
      infraestructura: 'Megaproyecto de Puerto Antioquia en Bahía Colombia; autopistas Mar 1 y Mar 2 con túnel del Toyo que conectan a Medellín en 4 horas.',
      humano: 'Población afrocolombiana e indígena con saberes ancestrales en navegación y cultivo; jóvenes técnicos en operaciones portuarias y agropecuarias.',
      empresarial: 'Asociaciones de pequeños y medianos plataneros, cooperativas bananeras y nuevas empresas de logística portuaria y aduanera.'
    },
    dinamicas: 'Radical transformación territorial por la apertura de las vías 4G Mar 1 y Mar 2; llegada de inversionistas logísticos e inmobiliarios.',
    brechas: 'Cobertura insuficiente de agua potable y saneamiento en barrios costeros; déficit de vivienda formal ante la llegada de nuevos trabajadores portuarios.',
    oportunidades: 'Consolidación como el puerto marítimo más cercano a los principales centros de producción del país (Antioquia, Eje Cafetero, Valle); agroindustria del plátano deshidratado.',
    foda: {
      f: 'Salida más corta del interior del país al océano Atlántico; liderazgo agroexportador consolidado; régimen de Distrito Especial Portuario.',
      o: 'Operación comercial de Puerto Antioquia que atraerá billones de pesos en comercio internacional; ecoturismo en el Golfo de Urabá.',
      d: 'Brechas socioeconómicas históricas en servicios básicos domiciliarios; erosión marina en la costa de Punta Yarumal.',
      a: 'Flujos migratorios irregulares que generan presión sobre los servicios públicos del municipio; aumento del nivel del mar.'
    }
  },

  // 8. ZAO (Amazonía Orinoquía)
  {
    zona: 'ZAO',
    municipio: 'Acacías',
    depto: 'Meta',
    poblacion: '110.000 hab. (82% urbana, 18% rural)',
    vocacion: 'Producción de hidrocarburos, agroindustria de palma de aceite y arroz, ganadería bovina de ceba, ecoturismo del piedemonte llanero.',
    desempleo: '11.8%',
    informalidad: '57.0%',
    pibSector: 'Extracción de petróleo y servicios asociados (44%), Agroindustria (palma, arroz, maíz) (26%), Comercio y servicios (18%), Ganadería y turismo (12%).',
    pilares: {
      gobierno: 'Alcaldía Municipal con experiencia en administración de regalías petroleras; planes de diversificación económica municipal.',
      desarrollo: 'Presencia de los principales campos de crudo pesado del país (Campo Castilla de Ecopetrol); plantas extractoras de aceite crudo de palma.',
      infraestructura: 'Corredor vial pavimentado hacia Villavicencio y Bogotá; aeropuerto Vanguardia a 30 minutos; red de acueducto con proyectos de ampliación.',
      humano: 'Técnicos certificados en operaciones petroleras, soldadura API, electricidad industrial y agronomía de palma aceitera.',
      empresarial: 'Contratistas locales de la industria energética, cooperativas agropecuarias y prestadores de servicios hoteleros y campestres.'
    },
    dinamicas: 'Transición gradual hacia la agroindustria y la bioenergía para reducir la dependencia de las regalías petroleras; auge de fincas turísticas y deportes extremos.',
    brechas: 'Vulnerabilidad de las finanzas municipales ante las bajas del precio internacional del barril de petróleo; necesidad de tecnificar el riego de cultivos.',
    oportunidades: 'Generación de biogás y energía eléctrica a partir de la biomasa de la palma de aceite; producción de concentrados para animales; turismo de naturaleza.',
    foda: {
      f: 'Flujo financiero histórico por regalías petroleras; suelos fértiles con alta aptitud para palma y arroz; cercanía a la capital del país.',
      o: 'Inversiones en transición energética y plantas de hidrógeno en el Meta; demanda nacional e internacional de aceites vegetales sostenibles.',
      d: 'Costos locales de vida elevados impulsados por los salarios petroleros; dependencia fiscal de un solo sector extractivo.',
      a: 'Derrumbes recurrentes en la vía al Llano (Bogotá-Villavicencio) que interrumpen el transporte de cosechas y combustibles.'
    }
  },
  {
    zona: 'ZAO',
    municipio: 'Yopal',
    depto: 'Casanare',
    poblacion: '180.000 hab. (85% urbana, 15% rural)',
    vocacion: 'Capital agroindustrial y petrolera de la Orinoquía, molinería y secado de arroz, ganadería de cría y ceba, centro logístico y de servicios del Llano.',
    desempleo: '11.2%',
    informalidad: '54.2%',
    pibSector: 'Sector petrolero y gasífero (36%), Agroindustria arrocera y ganadera (32%), Comercio mayorista y servicios financieros (20%), Construcción (12%).',
    pilares: {
      gobierno: 'Gobernabilidad municipal consolidada; articulación con Ecopetrol y operadoras de gas en proyectos de inversión social e infraestructura.',
      desarrollo: 'Centro neurálgico de acopio y trilla del arroz de los Llanos Orientales; yacimientos de gas natural que abastecen al interior del país.',
      infraestructura: 'Aeropuerto El Alcaraván con categoría internacional y pistas de alta resistencia; Troncal del Llano; nueva planta de agua potable definitiva.',
      humano: 'Universidades locales (Unitrópico - universidad pública de Casanare, UNAD CEAD Yopal); talento formado en energías y producción agropecuaria.',
      empresarial: 'Grandes molinos arroceros tecnificados, empresas de transporte pesado de carga líquida y seca, y proveedores petroleros.'
    },
    dinamicas: 'Aprovechamiento del gas natural en el sitio para proyectos de manufactura y agroindustria; modernización de la cadena cárnica con plantas de beneficio.',
    brechas: 'Vulnerabilidad de la vía del Cusiana hacia Sogamoso y Boyacá; estacionalidad hídrica extrema (inundaciones en invierno y sequías en verano).',
    oportunidades: 'Agroindustria de harina de arroz y derivados; producción de gas natural vehicular y licuado para flotas limpias; turismo llanero auténtico (safaris en sabanas).',
    foda: {
      f: 'Infraestructura urbana moderna y aeropuerto de gran capacidad; abundancia de recursos energéticos (gas natural); liderazgo arrocero.',
      o: 'Expansión de la frontera agrícola de cereales y soya en la Orinoquía; desarrollo de proyectos de reforestación comercial con bonos de carbono.',
      d: 'Dependencia de insumos agrícolas importados; fragilidad geológica de la conexión terrestre hacia el altiplano cundiboyacense.',
      a: 'Caída en los precios internacionales de los hidrocarburos; fenómenos climáticos severos que inundan pastizales y vías secundarias.'
    }
  },
  {
    zona: 'ZAO',
    municipio: 'Leticia',
    depto: 'Amazonas',
    poblacion: '52.000 hab. (65% urbana, 35% comunidades indígenas en ribera)',
    vocacion: 'Turismo ecológico y de biodiversidad amazónica, investigación científica y biológica, comercio fluvial trifronterizo (Colombia, Perú, Brasil), pesca artesanal.',
    desempleo: '12.5%',
    informalidad: '68.5%',
    pibSector: 'Turismo, hotelería y expediciones ecológicas (38%), Comercio fronterizo con Tabatinga e Iquitos (30%), Servicios del Estado y educación (22%), Pesca (10%).',
    pilares: {
      gobierno: 'Condición de municipio fronterizo e insular continental (sin conexión por carretera al resto del país); diálogo intercultural con autoridades indígenas tradicionales.',
      desarrollo: 'Principal puerto colombiano sobre el río Amazonas; sede del Instituto Amazónico de Investigaciones Científicas SINCHI y UNAL Sede Amazonia.',
      infraestructura: 'Aeropuerto Internacional Alfredo Vásquez Cobo (clave para el abastecimiento y turismo); puerto fluvial sobre el río Amazonas; red eléctrica aislada.',
      humano: 'Poblaciones indígenas portadoras de conocimientos etnobotánicos invaluables; guías turísticos bilingües y científicos de la selva húmeda tropical.',
      empresarial: 'Operadores turísticos comunitarios, cooperativas de pescadores y comerciantes de frontera en conurbación abierta con Tabatinga (Brasil).'
    },
    dinamicas: 'Desarrollo de turismo regenerativo y de inmersión en comunidades indígenas; investigación de principios activos naturales para la medicina y cosmética.',
    brechas: 'Dependencia absoluta del transporte aéreo para carga y pasajeros con el interior del país; generación eléctrica con combustibles fósiles costosos.',
    oportunidades: 'Bioeconomía y productos forestales no maderables (aceites de sacha inchi, asaí, camu camu); integración logística y sanitaria en la triple frontera amazónica.',
    foda: {
      f: 'Marca mundial de la Amazonía como pulmón del planeta; convivencia pacífica trifronteriza; centros científicos de biodiversidad instalados.',
      o: 'Recursos globales de cooperación para protección del bioma amazónico; creciente interés en viajes de naturaleza, yoga y bienestar espiritual.',
      d: 'Aislamiento terrestre total con altos costos de vida y fletes aéreos; saneamiento básico limitado en comunidades ribereñas.',
      a: 'Contaminación de ríos por minería ilegal en cabeceras de cuencas binacionales; cambio climático que altera los niveles del río Amazonas.'
    }
  }
];

const ZONA_NOMBRE = {
  ZAO: 'Zona Amazonía Orinoquía (ZAO)',
  ZCAR: 'Zona Caribe (ZCAR)',
  ZCBC: 'Zona Centro Bogotá Cundinamarca (ZCBC)',
  ZCBOY: 'Zona Centro Boyacá (ZCB)',
  ZCORI: 'Zona Centro Oriente (ZCOR)',
  ZCSUR: 'Zona Centro Sur (ZCSUR)',
  ZOCC: 'Zona Occidente (ZOCC)',
  ZSUR: 'Zona Sur (ZSUR)',
};

const limpiar = (t) => String(t).replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
const partes = (t) => String(t).split(';').map(limpiar).filter(Boolean);
const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const minus1 = (t) => (/^\p{Lu}\p{Ll}+ \p{Lu}/u.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));
const viñetas = (t) => partes(t).map((x) => `- ${mayus(x)}.`).join('\n');
/** «13.8%» → «≈ 13,8 %» */
const aprox = (t) => `≈ ${String(t).replace(/(\d)\.(\d)(?=\s*%)/g, '$1,$2').replace(/(\d)%/g, '$1 %')}`;

function buildStudySections(reg) {
  const m = reg.municipio;
  const zonaLarga = ZONA_NOMBRE[reg.zona] || reg.zona;
  const brechas = partes(reg.brechas);
  const dinamicas = partes(reg.dinamicas);
  const amenaza = partes(reg.foda.a)[0] || '';
  const fodaText = `### Fortalezas
${viñetas(reg.foda.f)}

### Oportunidades
${viñetas(reg.foda.o)}

### Debilidades
${viñetas(reg.foda.d)}

### Amenazas
${viñetas(reg.foda.a)}`;

  return [
    {
      number: 1,
      title: 'Identificación del territorio',
      phase: 'Apertura',
      kind: 'ai',
      status: 'ok',
      markdown: `## 1. Identificación del territorio

**${m}** (${reg.depto}, Colombia) hace parte de la ${zonaLarga} de la Universidad Nacional Abierta y a Distancia (UNAD).

Lo que más lo distingue en lo productivo: ${minus1(limpiar(reg.vocacion))}. Esta ficha lo lee como un territorio con ventajas propias y brechas concretas, para que las ideas del taller partan de lo que ya existe en ${m}.`,
    },
    {
      number: 2,
      title: 'Ficha de caracterización productiva',
      phase: 'Fase 1 — Caracterización productiva',
      kind: 'ai',
      status: 'ok',
      markdown: `## 2. Ficha de caracterización productiva

### Perfil productivo
La vocación productiva de ${m} se fundamenta en: **${limpiar(reg.vocacion)}.**

Peso aproximado de los sectores en su economía:
- **Distribución sectorial del PIB:** ${reg.pibSector}

### Cuadro de indicadores socioeconómicos
| Indicador | Dato de referencia (aproximado) | Dónde validarlo |
|---|---|---|
| Población total | ≈ ${reg.poblacion} | DANE, proyecciones de población |
| Tasa de desempleo | ${aprox(reg.desempleo)} | DANE, Gran Encuesta Integrada de Hogares |
| Tasa de informalidad laboral | ${aprox(reg.informalidad)} | DANE, Gran Encuesta Integrada de Hogares |
| Sector de mayor peso | ${reg.pibSector.split('(')[0].trim()} | DANE, cuentas departamentales |

Estas cifras son de referencia y dan el orden de magnitud; confírmalas en la fuente de la tercera columna antes de citarlas en un documento.`,
    },
    {
      number: 3,
      title: 'Lectura por pilar de competitividad',
      phase: 'Fase 2 — Lectura sistémica de competitividad',
      kind: 'ai',
      status: 'ok',
      markdown: `## 3. Lectura por pilar de competitividad

### 1. Gobierno e instituciones
${limpiar(reg.pilares.gobierno)}.
Nivel de evidencia: medio

### 2. Desarrollo económico
${limpiar(reg.pilares.desarrollo)}.
Nivel de evidencia: medio

### 3. Infraestructura productiva
${limpiar(reg.pilares.infraestructura)}.
Nivel de evidencia: medio

### 4. Capital humano
${limpiar(reg.pilares.humano)}.
Nivel de evidencia: medio

### 5. Eficiencia empresarial
${limpiar(reg.pilares.empresarial)}.
Nivel de evidencia: medio`,
    },
    {
      number: 4,
      title: 'Dinámicas territoriales',
      phase: 'Fase 2 — Lectura sistémica de competitividad',
      kind: 'ai',
      status: 'ok',
      markdown: `## 4. Dinámicas territoriales

Cambios que hoy se ven en ${m}:

${dinamicas.map((x) => `- ${mayus(x)}.`).join('\n')}

Para precisar con las personas del territorio: cuáles de estos cambios ya generan empleo y empresas locales, y cuáles solo pasan por ${m} sin dejar valor.`,
    },
    {
      number: 5,
      title: 'Brechas regionales',
      phase: 'Fase 2 — Lectura sistémica de competitividad',
      kind: 'ai',
      status: 'ok',
      markdown: `## 5. Brechas regionales

Lo que le falta a ${m} frente a otros municipios de escala parecida:

${brechas.map((x) => `- ${mayus(x)}.`).join('\n')}

Estas brechas son el punto de partida de la Ideación: una buena idea debería ayudar a cerrar al menos una.`,
    },
    {
      number: 6,
      title: 'Oportunidades del entorno',
      phase: 'Fase 2 — Lectura sistémica de competitividad',
      kind: 'ai',
      status: 'ok',
      markdown: `## 6. Oportunidades del entorno

Lo que el entorno regional y nacional le ofrece hoy a ${m}:

${viñetas(reg.oportunidades)}

Cada oportunidad necesita un actor local que la lidere; esa pregunta se trabaja después, en la Ideación.`,
    },
    {
      number: 7,
      title: 'Matriz FODA territorial',
      phase: 'Fase 3 — Síntesis FODA territorial',
      kind: 'ai',
      status: 'ok',
      markdown: `## 7. Matriz FODA territorial

${fodaText}`,
    },
    {
      number: 8,
      title: 'Resultado del contraste participativo',
      phase: 'Fase 4 — Contraste participativo',
      kind: 'ai',
      status: 'ok',
      markdown: `## 8. Resultado del contraste participativo

Este contraste todavía no se ha hecho con las personas de ${m}: este estudio es la base para hacerlo en el taller. Preguntas para discutirlo en grupo:

- De las brechas del bloque 5, ¿cuál se siente más cerca en ${m}?
- De las oportunidades del bloque 6, ¿cuál ya tiene un actor local que la pueda liderar?
- ¿Qué dato de este estudio no coincide con lo que viven las personas del territorio?

Lo que el grupo corrija aquí es lo que pasa a la herramienta de Ideación.`,
    },
    {
      number: 9,
      title: 'Alertas de verificación humana consolidadas',
      phase: 'Fase 4 — Contraste participativo',
      kind: 'app',
      status: 'ok',
      markdown: `## 9. Alertas de verificación humana consolidadas

- **Alerta 1 (Cifras del bloque 2):** la población, el desempleo y la informalidad de ${m} son valores de referencia aproximados; confírmalos en el DANE antes de citarlos.
- **Alerta 2 (Amenaza principal):** confirma con una fuente local que sigue vigente esta amenaza: ${minus1(amenaza)}.
- **Alerta 3 (Brecha prioritaria):** valida con actores de ${m} que esta brecha es real y urgente: ${minus1(brechas[0] || '')}.`,
    },
    {
      number: 10,
      title: 'Fuentes consultadas',
      phase: 'Cierre',
      kind: 'ai',
      status: 'ok',
      markdown: `## 10. Fuentes consultadas

Fuentes con las que se debe validar este estudio (la consulta de cada una queda pendiente):

- **Departamento Administrativo Nacional de Estadística [DANE].** Proyecciones de población, mercado laboral y cuentas departamentales para ${reg.depto} y ${m}. https://www.dane.gov.co
- **Departamento Nacional de Planeación [DNP].** TerriData, fichas de caracterización territorial de ${m}. https://terridata.dnp.gov.co
- **Cámara de Comercio de ${m} o de su jurisdicción.** Informes de dinámica empresarial y competitividad.
- **Alcaldía de ${m}.** Plan de Desarrollo Municipal vigente.
- **Universidad Nacional Abierta y a Distancia [UNAD].** Documentos de la ${zonaLarga}.`,
    },
    {
      number: 11,
      title: 'Observaciones de trazabilidad',
      phase: 'Cierre',
      kind: 'ai',
      status: 'ok',
      markdown: `## 11. Observaciones de trazabilidad

Este estudio de **${m} (${reg.depto})** es una base de referencia preparada con conocimiento general de fuentes públicas (DANE, DNP, planes de desarrollo, cámaras de comercio). Las cifras son aproximadas y no se contrastaron una a una con el documento fuente, por eso el bloque 9 pide validarlas. La lectura de pilares, brechas, oportunidades y FODA es un primer análisis para discutir, no un hecho cerrado.`,
    },
    {
      number: 12,
      title: 'Matriz de vacíos de información',
      phase: 'Cierre',
      kind: 'app',
      status: 'ok',
      markdown: `## 12. Matriz de vacíos de información

| Dimensión | Vacío identificado | Estrategia de cierre |
|---|---|---|
| Cifras del territorio | Los indicadores del bloque 2 son aproximados y sin verificar contra la fuente | Contrastarlos con el DANE y TerriData antes de usarlos en un informe |
| Dinámica propia de ${m} | No se sabe cuánto empleo y cuántas empresas locales genera: ${minus1(dinamicas[0] || '')} | Entrevistas cortas a tres actores locales durante el taller |
| Inversión privada en I+D | Faltan métricas municipales de inversión privada en investigación aplicada | Preguntarlo a empresarios locales en el taller de ideación |`,
    },
  ];
}

const CLOSING = '\n\nEste estudio es una base de referencia que se valida con las fuentes y con las personas del territorio. No declara la vocación de servicio del territorio ni sus temas estratégicos; esa definición corresponde a la herramienta de Ideación del Laboratorio.';

const studies = REGIONES.map((reg, idx) => {
  const sections = buildStudySections(reg);
  const containerData = sections.map((s) => s.markdown).join('\n\n') + CLOSING;
  const id = `study-banco-${reg.zona.toLowerCase()}-${reg.municipio.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')}`;

  return {
    id,
    createdAt: new Date('2026-11-14T12:00:00.000Z').toISOString(),
    territoryName: reg.municipio,
    department: reg.depto,
    zonaUNAD: ZONA_NOMBRE[reg.zona] || reg.zona,
    prompt0Data: {
      labName: `Estudio Territorial ${reg.municipio}`,
      labNameKind: 'nombre',
      zonaUNAD: ZONA_NOMBRE[reg.zona] || reg.zona,
      municipality: reg.municipio,
      department: reg.depto,
      country: 'Colombia',
      isCapital: reg.municipio === 'Bogotá',
      capitalSede: reg.municipio === 'Bogotá' ? 'Distrito Capital / Sede Central' : undefined,
    },
    containerData,
    sections,
  };
});

writeFileSync(OUT_FILE, JSON.stringify(studies, null, 2), 'utf8');
console.log(`✓ Generados ${studies.length} estudios territoriales exitosamente en:`);
console.log(`  ${OUT_FILE}`);
