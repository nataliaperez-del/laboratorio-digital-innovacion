import { INNOVATION_BADGES, type InnovationRank } from './gamification';

interface CertificateData {
  recipientName: string;
  territoryName: string;
  department: string;
  zonaUNAD: string;
  rank: InnovationRank;
  totalXp: number;
  unlockedBadgeIds: string[];
}

export function generateCertificateHtml(data: CertificateData): string {
  const issueDate = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const certCode = `IH360-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const unlockedBadges = INNOVATION_BADGES.filter((b) => data.unlockedBadgeIds.includes(b.id));

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Credencial Oficial de Innovación — ${data.recipientName}</title>
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
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      background: #02141A;
      color: #E2E8F0;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Marco Ornamental de Borde Doble Dorado */
    .certificate-frame {
      width: 283mm;
      height: 196mm;
      border: 3px solid #D4AF37;
      position: relative;
      background: radial-gradient(ellipse at center, #06313D 0%, #031C24 60%, #011015 100%);
      padding: 10mm 14mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: inset 0 0 40px rgba(0,0,0,0.8);
    }

    /* Borde interior delgado */
    .inner-border {
      position: absolute;
      top: 3mm;
      left: 3mm;
      right: 3mm;
      bottom: 3mm;
      border: 1px solid rgba(212, 175, 55, 0.45);
      pointer-events: none;
    }

    /* Esquinas Ornamentales */
    .corner {
      position: absolute;
      width: 22px;
      height: 22px;
      border-color: #D4AF37;
      border-style: solid;
    }
    .corner-tl { top: 6mm; left: 6mm; border-width: 3px 0 0 3px; }
    .corner-tr { top: 6mm; right: 6mm; border-width: 3px 3px 0 0; }
    .corner-bl { bottom: 6mm; left: 6mm; border-width: 0 0 3px 3px; }
    .corner-br { bottom: 6mm; right: 6mm; border-width: 0 3px 3px 0; }

    /* Cabecera */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(212, 175, 55, 0.35);
      padding-bottom: 4mm;
      position: relative;
      z-index: 10;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #5EC2DD;
      text-transform: uppercase;
    }
    .brand-title span.hub { color: #A8C63C; }
    .brand-title span.num { color: #F29F05; }
    .institution {
      text-align: right;
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.3;
    }
    .institution strong {
      color: #F8FAFC;
      font-size: 12px;
      letter-spacing: 0.5px;
    }

    /* Cuerpo del Certificado */
    .body {
      text-align: center;
      position: relative;
      z-index: 10;
      margin: 3mm 0;
    }
    .cert-heading {
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #D4AF37;
      font-weight: 700;
      margin-bottom: 2mm;
    }
    .cert-main-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #FFFFFF;
      text-transform: uppercase;
      text-shadow: 0 2px 10px rgba(0,0,0,0.6);
      margin-bottom: 2mm;
      font-family: Georgia, serif;
    }
    .cert-subtext {
      font-size: 12px;
      color: #CBD5E1;
      max-width: 190mm;
      margin: 0 auto 3mm;
      line-height: 1.4;
    }
    .recipient-name {
      font-size: 28px;
      font-weight: 800;
      color: #FFD700;
      border-bottom: 2px solid rgba(212, 175, 55, 0.6);
      display: inline-block;
      padding: 0 16mm 2mm;
      margin: 1mm 0 3mm;
      letter-spacing: 1px;
      text-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
    }
    .rank-box {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(4, 34, 43, 0.8);
      border: 1.5px solid #D4AF37;
      padding: 5px 20px;
      border-radius: 30px;
      margin-bottom: 3mm;
      box-shadow: 0 0 15px rgba(212, 175, 55, 0.25);
    }
    .rank-level {
      font-size: 11px;
      font-weight: 800;
      color: #5EC2DD;
      text-transform: uppercase;
    }
    .rank-name {
      font-size: 14px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: 1px;
    }
    .rank-xp {
      font-size: 11px;
      font-weight: 700;
      color: #D4AF37;
    }

    /* Vitrina de Insignias Acreditadas */
    .badges-strip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 2mm 0;
      flex-wrap: wrap;
    }
    .badge-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(212, 175, 55, 0.35);
      border-radius: 8px;
      padding: 3px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 600;
      color: #F1F5F9;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    /* Firmas y Metadatos */
    .footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      border-top: 1px solid rgba(212, 175, 55, 0.35);
      padding-top: 4mm;
      position: relative;
      z-index: 10;
    }
    .cert-meta {
      font-size: 9.5px;
      color: #94A3B8;
      line-height: 1.5;
      text-align: left;
    }
    .cert-meta strong {
      color: #F8FAFC;
    }
    .signatures {
      display: flex;
      gap: 25mm;
      text-align: center;
    }
    .sig-line {
      width: 48mm;
      border-top: 1px solid #D4AF37;
      padding-top: 2mm;
      font-size: 9.5px;
      color: #CBD5E1;
      line-height: 1.3;
    }
    .sig-line strong {
      display: block;
      color: #FFFFFF;
      font-size: 10.5px;
    }

    /* Fondo Holográfico de Marca de Agua */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 140mm;
      height: 140mm;
      opacity: 0.04;
      pointer-events: none;
      z-index: 1;
    }
  </style>
</head>
<body>
  <div class="certificate-frame">
    <div class="inner-border"></div>
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>

    <!-- Marca de Agua de Fondo -->
    <svg class="watermark" viewBox="0 0 100 100" fill="none" stroke="#FFFFFF" stroke-width="1.5">
      <circle cx="50" cy="50" r="45" />
      <polygon points="50,10 88,32 88,68 50,90 12,68 12,32" />
      <circle cx="50" cy="50" r="22" />
      <circle cx="50" cy="50" r="6" fill="#FFFFFF" />
    </svg>

    <!-- Cabecera -->
    <header class="header">
      <div class="brand-title">
        INNOVA<span class="hub">HUB</span><span class="num">360</span>
        <div style="font-size: 9px; letter-spacing: 1px; color: #94A3B8; font-weight: 600; margin-top: 2px;">
          LABORATORIO DE INNOVACIÓN EN LÍNEA
        </div>
      </div>
      <div class="institution">
        <strong>VICERRECTORÍA DE INNOVACIÓN Y EMPRENDIMIENTO (VIEM)</strong><br>
        Universidad Nacional Abierta y a Distancia — UNAD<br>
        Acreditada Institucionalmente en Alta Calidad
      </div>
    </header>

    <!-- Cuerpo -->
    <main class="body">
      <div class="cert-heading">Credencial y Acreditación de Mérito Metodológico</div>
      <h1 class="cert-main-title">Certificado de Competencias en Innovación</h1>
      
      <p class="cert-subtext">
        El Observatorio InnovaHub360 y la Vicerrectoría de Innovación y Emprendimiento (VIEM) de la UNAD certifican que el equipo o líder innovador:
      </p>

      <div class="recipient-name">
        ${data.recipientName}
      </div>

      <div>
        <p class="cert-subtext" style="margin-bottom: 2mm;">
          Ha estructurado soluciones aplicables a los retos regionales de <strong>${data.territoryName}${data.department ? `, ${data.department}` : ''}</strong> (${data.zonaUNAD || 'UNAD'}), alcanzando con excelencia el rango oficial de:
        </p>

        <div class="rank-box">
          <span class="rank-level">Nivel ${data.rank.level}</span>
          <span class="rank-name">${data.rank.title.toUpperCase()}</span>
          <span class="rank-xp">★ ${data.totalXp} XP Acumulado</span>
        </div>
      </div>

      <!-- Vitrina de Insignias Obtenidas -->
      <div style="margin-top: 2mm;">
        <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 1.5mm;">
          Insignias Oficiales Verificadas (${unlockedBadges.length} de ${INNOVATION_BADGES.length}):
        </span>
        <div class="badges-strip">
          ${unlockedBadges.map((b) => `
            <div class="badge-pill">
              <span class="badge-dot" style="background-color: ${b.color}; box-shadow: 0 0 6px ${b.color};"></span>
              <span>${b.title}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </main>

    <!-- Firmas y Verificación -->
    <footer class="footer">
      <div class="cert-meta">
        <div><strong>Código de Verificación:</strong> ${certCode}</div>
        <div><strong>Fecha de Expedición:</strong> ${issueDate}</div>
        <div><strong>Validación:</strong> Registro de Evidencias en Banco Unificado InnovaHub360</div>
      </div>

      <div class="signatures">
        <div class="sig-line">
          <strong>Vicerrectoría VIEM</strong>
          Innovación y Emprendimiento UNAD
        </div>
        <div class="sig-line">
          <strong>Dirección InnovaHub360</strong>
          Observatorio y Laboratorio en Línea
        </div>
      </div>
    </footer>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;
}

/**
 * Abre una ventana limpia de impresión/guardado en PDF con la credencial oficial.
 */
export function openCertificatePrintWindow(data: CertificateData): void {
  const html = generateCertificateHtml(data);
  const printWindow = window.open('', '_blank', 'width=1120,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
