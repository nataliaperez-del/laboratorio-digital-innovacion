import { INNOVATION_BADGES, type InnovationRank } from './gamification';

export interface BadgeCertificateMetadata {
  id: string;
  badgeTitle: string;
  badgeAsset: string;
  competenceTitle: string;
  accreditationText: string;
  hours: number;
  badgeColor: string;
}

export const BADGE_CERTIFICATES: Record<string, BadgeCertificateMetadata> = {
  pionero_territorial: {
    id: 'pionero_territorial',
    badgeTitle: 'Pionero Territorial',
    badgeAsset: 'pionero_territorial',
    competenceTitle: 'Diagnóstico y Caracterización Territorial MDVT',
    accreditationText:
      'Capacidad para realizar el diagnóstico territorial integral, caracterizar vocaciones productivas, pilares estratégicos y estructurar oportunidades de innovación en el entorno regional.',
    hours: 24,
    badgeColor: '#00F5FF',
  },
  visionario_estrategico: {
    id: 'visionario_estrategico',
    badgeTitle: 'Visionario Estratégico',
    badgeAsset: 'visionario_estrategico',
    competenceTitle: 'Ideación y Vocación Estratégica Regional',
    accreditationText:
      'Capacidad para formular hipótesis de reto territorial, estructurar vocaciones productivas y seleccionar alternativas estratégicas de alto impacto y factibilidad.',
    hours: 24,
    badgeColor: '#B4FF2B',
  },
  arquitecto_tendencias: {
    id: 'arquitecto_tendencias',
    badgeTitle: 'Arquitecto de Tendencias',
    badgeAsset: 'arquitecto_tendencias',
    competenceTitle: 'Prospectiva Tecnológica y Árbol de Innovación',
    accreditationText:
      'Capacidad para estructurar árboles holográficos de innovación prospectiva, articulando tendencias globales, dinámicas nacionales y frutos de aplicación territorial.',
    hours: 30,
    badgeColor: '#00E5FF',
  },
  ingeniero_prototipos: {
    id: 'ingeniero_prototipos',
    badgeTitle: 'Ingeniero de Prototipos',
    badgeAsset: 'ingeniero_prototipos',
    competenceTitle: 'Estructuración de Prototipado y Validación TRL',
    accreditationText:
      'Capacidad para formular planes de prototipado formal con niveles de madurez tecnológica TRL, arquitectura de solución técnica, fases de validación y métricas de desempeño.',
    hours: 36,
    badgeColor: '#76DD00',
  },
  custodio_conocimiento: {
    id: 'custodio_conocimiento',
    badgeTitle: 'Custodio del Conocimiento',
    badgeAsset: 'custodio_conocimiento',
    competenceTitle: 'Gestión y Transferencia del Conocimiento Regional',
    accreditationText:
      'Capacidad para consolidar y aportar ejercicios estructurados al Banco Unificado de Innovación, garantizando la trazabilidad y memoria del ecosistema territorial.',
    hours: 20,
    badgeColor: '#00B4D8',
  },
  vinculo_cognitivo: {
    id: 'vinculo_cognitivo',
    badgeTitle: 'Vínculo Cognitivo',
    badgeAsset: 'vinculo_cognitivo',
    competenceTitle: 'Inteligencia Aumentada y Asistencia Holográfica ZOE',
    accreditationText:
      'Capacidad para interactuar con sistemas de inteligencia aumentada, co-creando estrategias de innovación territorial asistidas por la agente holográfica ZOE 3D.',
    hours: 18,
    badgeColor: '#00FFFF',
  },
  maestro_innovador_360: {
    id: 'maestro_innovador_360',
    badgeTitle: 'Maestro Innovador 360',
    badgeAsset: 'maestro_innovador_360',
    competenceTitle: 'Innovación Integral y Liderazgo Territorial 360',
    accreditationText:
      'Dominio y articulación de los 4 ejes metodológicos del Laboratorio Digital de Innovación, integrando caracterización territorial, prospectiva de tendencias, ideación estratégica y prototipado TRL.',
    hours: 120,
    badgeColor: '#FFD700',
  },
};

export interface CertificateData {
  recipientName?: string;
  recipientId?: string;
  teamName?: string;
  badgeId?: string;
  issueDate?: string;
}

export const BADGE_UNIT_COLORS: Record<string, { primary: string; glow: string; label: string }> = {
  pionero_territorial: {
    primary: '#10B981', // Verde esmeralda territorial distinguido
    glow: 'rgba(16, 185, 129, 0.45)',
    label: 'Estudio Territorial',
  },
  visionario_estrategico: {
    primary: '#F29F05', // Ámbar cálido de ideación
    glow: 'rgba(242, 159, 5, 0.50)',
    label: 'Ideación Estratégica',
  },
  arquitecto_tendencias: {
    primary: '#00C8FF', // Azul celeste / Cian de árbol de tendencias
    glow: 'rgba(0, 200, 255, 0.50)',
    label: 'Árbol de Innovación',
  },
  ingeniero_prototipos: {
    primary: '#E024A5', // Fucsia prototipado
    glow: 'rgba(224, 36, 165, 0.52)',
    label: 'Prototipado TRL',
  },
  custodio_conocimiento: {
    primary: '#A78BFA', // Púrpura / Violeta banco unificado
    glow: 'rgba(167, 139, 250, 0.50)',
    label: 'Banco de Innovación',
  },
  vinculo_cognitivo: {
    primary: '#00F5FF', // Cian digital ZOE
    glow: 'rgba(0, 245, 255, 0.50)',
    label: 'Agente ZOE 3D',
  },
  maestro_innovador_360: {
    primary: '#FFD700', // Oro imperial 360
    glow: 'rgba(255, 215, 0, 0.55)',
    label: 'Maestría 360',
  },
};

export function generateCertificateHtml(data: CertificateData): string {
  const recipientName = data.recipientName?.trim() || 'Natalia Elizabeth Pérez Cabrera';
  const recipientId = data.recipientId?.trim() || 'C.C. 1.085.241.978';
  const teamName = data.teamName?.trim() || 'Equipo Innovador UNAD';

  const normalizedBadgeId = (data.badgeId || 'pionero_territorial').toLowerCase().replace(/-/g, '_');
  const badgeInfo = BADGE_CERTIFICATES[normalizedBadgeId] || BADGE_CERTIFICATES['pionero_territorial'];
  const unitTheme = BADGE_UNIT_COLORS[badgeInfo.id] || BADGE_UNIT_COLORS['pionero_territorial'];

  const now = new Date();
  const issueDateFormatted = data.issueDate || `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const certCode = `IH360-${badgeInfo.id.toUpperCase().substring(0, 4)}-${Date.now().toString(36).toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Certificado de Competencias en Innovación — ${badgeInfo.badgeTitle} — ${recipientName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 297mm;
      height: 210mm;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      background: #02141C;
      color: #E2E8F0;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Contenedor Principal del Certificado */
    .certificate-card {
      width: 283mm;
      height: 196mm;
      position: relative;
      background: radial-gradient(ellipse at 75% 50%, #06313D 0%, #031D26 45%, #011218 100%);
      border: 1.5px solid rgba(0, 245, 255, 0.4);
      border-radius: 12px;
      padding: 14mm 16mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.9), inset 0 0 40px rgba(0, 245, 255, 0.08);
      overflow: hidden;
    }

    /* Malla sutil de fondo */
    .bg-grid {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(0, 245, 255, 0.12) 0%, transparent 40%),
        radial-gradient(circle at 80% 50%, rgba(0, 245, 255, 0.18) 0%, transparent 50%),
        linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 35px 35px, 35px 35px;
      pointer-events: none;
      z-index: 1;
    }

    /* Olas sutiles de energía en la base izquierda */
    .wave-decoration {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 55%;
      height: 40%;
      background: radial-gradient(ellipse at 0% 100%, rgba(0, 229, 255, 0.1) 0%, transparent 70%);
      pointer-events: none;
      z-index: 1;
    }

    /* Header del Certificado */
    .cert-header {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 3mm;
    }

    .brand-logo {
      height: 14mm;
      object-fit: contain;
    }

    .logos-unad-viem {
      height: 16mm;
      object-fit: contain;
    }

    /* Área Central: Dos Columnas */
    .cert-body {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 1;
      gap: 10mm;
    }

    /* Columna Izquierda: Información de Certificación */
    .cert-info {
      flex: 1.15;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3.5mm;
    }

    .cert-title {
      font-size: 21pt;
      font-weight: 800;
      letter-spacing: 2.2px;
      color: #FFFFFF;
      text-transform: uppercase;
      line-height: 1.15;
      text-shadow: 0 0 15px rgba(0, 245, 255, 0.3);
    }

    .cert-statement {
      font-size: 13pt;
      font-style: italic;
      color: #94A3B8;
      margin-top: 1mm;
    }

    .recipient-name {
      font-size: 25pt;
      font-weight: 800;
      color: #FFD23F;
      letter-spacing: 0.5px;
      line-height: 1.1;
      text-shadow: 0 0 20px rgba(255, 210, 63, 0.35);
    }

    .recipient-id {
      font-size: 13pt;
      font-weight: 600;
      color: #A5F3FC;
      letter-spacing: 1.5px;
    }

    /* Línea divisoria luminosa */
    .divider-glow {
      width: 100%;
      height: 1.5px;
      background: linear-gradient(90deg, #00F5FF 0%, rgba(0, 245, 255, 0.4) 70%, transparent 100%);
      box-shadow: 0 0 8px #00F5FF;
      margin: 1.5mm 0;
    }

    .competence-prompt {
      font-size: 11pt;
      font-style: italic;
      color: #94A3B8;
    }

    .competence-title {
      font-size: 17pt;
      font-weight: 800;
      color: #FFD23F;
      line-height: 1.2;
    }

    .accreditation-desc {
      font-size: 10.5pt;
      color: #CBD5E1;
      line-height: 1.45;
      max-width: 95%;
    }

    .accreditation-desc strong {
      color: #FFD23F;
      font-weight: 800;
    }

    .experience-hours {
      display: inline-flex;
      align-items: center;
      gap: 2.5mm;
      font-size: 10.5pt;
      color: #F1F5F9;
      font-weight: 600;
      margin-top: 1mm;
    }

    .experience-hours .icon-clock {
      color: #FFD23F;
      font-size: 12pt;
    }

    /* Columna Derecha: Insignia Gigante 3D */
    .cert-badge-column {
      flex: 0.85;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .badge-halo {
      position: absolute;
      width: 75mm;
      height: 75mm;
      border-radius: 50%;
      background: radial-gradient(circle, ${unitTheme.primary}45 0%, ${unitTheme.primary}12 50%, transparent 70%);
      filter: blur(15px);
      z-index: 1;
    }

    .badge-image {
      position: relative;
      z-index: 2;
      width: 78mm;
      height: 78mm;
      object-fit: contain;
      filter: drop-shadow(0 0 20px ${unitTheme.glow}) drop-shadow(0 0 8px ${unitTheme.primary}80);
      animation: float 6s ease-in-out infinite;
    }

    /* Reflejo / Resplandor inferior del sello */
    .badge-ground-glow {
      position: absolute;
      bottom: -4mm;
      width: 55mm;
      height: 8mm;
      border-radius: 50%;
      background: radial-gradient(ellipse at center, ${unitTheme.primary}80 0%, transparent 75%);
      filter: blur(4px);
      z-index: 1;
    }

    /* Footer del Certificado */
    .cert-footer {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 2mm;
      padding-top: 2mm;
    }

    .date-block {
      display: inline-flex;
      align-items: center;
      gap: 2.5mm;
      font-size: 13pt;
      font-weight: 700;
      color: #FFFFFF;
    }

    .date-block .icon-calendar {
      color: #FFD23F;
      font-size: 15pt;
    }

    .institutions-block {
      display: flex;
      align-items: center;
      gap: 4mm;
    }

    .logo-unad {
      height: 16mm;
      object-fit: contain;
    }

    .logo-divider {
      width: 1.5px;
      height: 14mm;
      background: #00F5FF;
      opacity: 0.6;
    }

    .logo-viem {
      height: 15mm;
      object-fit: contain;
    }

    /* Tira de seguridad y código de verificación */
    .security-badge {
      position: absolute;
      bottom: 2mm;
      left: 16mm;
      font-size: 6.5pt;
      color: rgba(148, 163, 184, 0.6);
      letter-spacing: 0.8px;
      font-family: monospace;
      z-index: 2;
    }

    @media print {
      body {
        background: #000;
      }
      .certificate-card {
        border: none;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="certificate-card">
    <div class="bg-grid"></div>
    <div class="wave-decoration"></div>

    <!-- Header: Logo InnovaHub360 -->
    <div class="cert-header">
      <img src="/assets/innovahub360_cert_logo.png" alt="InnovaHub360" class="brand-logo" onerror="this.onerror=null; this.src='/assets/logo-innovahub360-aislado.png';" />
    </div>

    <!-- Body: Información a la izquierda + Insignia 3D a la derecha -->
    <div class="cert-body">
      <div class="cert-info">
        <h1 class="cert-title">Certificado de Competencias<br>en Innovación</h1>
        
        <div class="cert-statement">Se certifica a:</div>
        <div class="recipient-name">${recipientName}</div>
        <div class="recipient-id">${recipientId}</div>

        <div class="divider-glow"></div>

        <div class="competence-prompt">Por haber demostrado la competencia:</div>
        <div class="competence-title">${teamName} · ${badgeInfo.competenceTitle}</div>

        <div class="accreditation-desc">
          <strong>Acredita:</strong> ${badgeInfo.accreditationText}
        </div>

        <div class="experience-hours">
          <span class="icon-clock">⏱</span>
          <span>| &nbsp; ${badgeInfo.hours} horas de experiencia en el entorno InnovaHub360</span>
        </div>
      </div>

      <!-- Insignia 3D Oficial con Resplandor -->
      <div class="cert-badge-column">
        <div class="badge-halo"></div>
        <img
          src="/assets/badges/${badgeInfo.badgeAsset}.png"
          alt="${badgeInfo.badgeTitle}"
          class="badge-image"
          onerror="this.onerror=null; this.src='/assets/badges/${badgeInfo.badgeAsset}.webp';"
        />
        <div class="badge-ground-glow"></div>
      </div>
    </div>

    <!-- Footer: Fecha a la izquierda + Logos UNAD / VIEM a la derecha -->
    <div class="cert-footer">
      <div class="date-block">
        <span class="icon-calendar">📅</span>
        <span>${issueDateFormatted}</span>
      </div>

      <div class="institutions-block">
        <img src="/assets/cert_logos_unad_viem.png" alt="UNAD · VIEM" class="logos-unad-viem" style="height: 15mm; object-fit: contain;" />
      </div>
    </div>

    <div class="security-badge">
      REGISTRO OFICIAL: ${certCode} · BANCO UNIFICADO DE INNOVACIÓN · VICERRECTORÍA VIEM · UNAD
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      // Auto print if opened in separate print window
      if (window.location.search.includes('print=true')) {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Abre una ventana emergente para descargar o imprimir el certificado en PDF nativo.
 */
export function openCertificatePrintWindow(data: CertificateData): void {
  const htmlContent = generateCertificateHtml(data);
  const printWindow = window.open('', '_blank', 'width=1200,height=840');

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 600);
  }
}
