import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import QRCode from 'qrcode';

export interface PdfExportOptions {
  filename?: string;
  hiddenSections?: string[];
  title?: string;
  projectNumber?: string;
  projectName?: string;
  companyName?: string;
  engineer?: string;
  printMode?: boolean;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkAngle?: number;
  includeRunningHeader?: boolean;
  includeQrCode?: boolean;
  qrCodeUrl?: string;
  qrCodeDataUrl?: string;
  qrCodePosition?: 'footer-right' | 'footer-left' | 'header-right';
  qrPages?: 'all' | 'first';
}

export const exportElementToPdf = async (
  elementId: string,
  filenameOrOptions: string | PdfExportOptions = 'design_report.pdf'
) => {
  const options: PdfExportOptions = typeof filenameOrOptions === 'string'
    ? { filename: filenameOrOptions }
    : filenameOrOptions;

  const filename = options.filename || 'design_report.pdf';
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  const isPrintMode = !!options.printMode;
  if (isPrintMode) {
    element.classList.add('pdf-print-mode');
    element.classList.add('app-theme-light');
    document.body.classList.add('pdf-print-mode');
  }

  // Hide any sections requested to be excluded in the PDF configuration
  const hiddenElements: { el: HTMLElement; prevDisplay: string }[] = [];
  if (options.hiddenSections && options.hiddenSections.length > 0) {
    options.hiddenSections.forEach(sectionKey => {
      const matched = element.querySelectorAll<HTMLElement>(`[data-pdf-section="${sectionKey}"]`);
      matched.forEach(el => {
        hiddenElements.push({ el, prevDisplay: el.style.display });
        el.style.display = 'none';
      });
    });
  }

  // Safely disable any cross-origin stylesheets during capture to prevent CORS cssRules access errors
  const crossOriginLinks: { link: HTMLLinkElement; prevDisabled: boolean }[] = [];
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(link => {
    try {
      if (link.href) {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) {
          crossOriginLinks.push({ link, prevDisabled: link.disabled });
          link.disabled = true;
        }
      }
    } catch {
      // ignore
    }
  });

  try {
    // Allow brief tick for DOM styles to settle before canvas rendering
    await new Promise(resolve => setTimeout(resolve, 60));

    const canvas = await toCanvas(element, {
      pixelRatio: 2, // Higher scale for high resolution print quality
      backgroundColor: isPrintMode ? '#ffffff' : '#0f172a',
      skipFonts: true, // Prevents html-to-image from traversing external stylesheets or failing on remote font fetches
      filter: (node) => {
        // Exclude cross-origin stylesheets or scripts from SVG cloning
        if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') {
          try {
            const url = new URL(node.href, window.location.href);
            if (url.origin !== window.location.origin) return false;
          } catch {
            return false;
          }
        }
        return true;
      }
    });

    const imgData = canvas.toDataURL('image/png');
    
    // A4 dimensions in mm
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate the height of the image in the PDF based on the A4 width
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Add subsequent pages if the content is taller than one A4 page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // Apply company watermark and custom project running headers across all pages
    const totalPages = pdf.getNumberOfPages();
    const watermarkText = options.watermarkText?.trim();
    const shouldWatermark = Boolean(options.watermarkEnabled && watermarkText && watermarkText.length > 0);
    const watermarkOpacity = options.watermarkOpacity ?? (isPrintMode ? 0.12 : 0.18);
    const watermarkAngle = options.watermarkAngle ?? 45;

    const displayProject = options.projectName?.trim() || options.projectNumber?.trim() || '';
    const displayCompany = options.companyName?.trim() || '';
    const displayEngineer = options.engineer?.trim() || '';
    const displayTitle = options.title?.trim() || '';

    // Generate Verification QR code data URL if enabled
    let qrDataUrl = options.qrCodeDataUrl;
    const shouldIncludeQr = Boolean(options.includeQrCode);
    const targetQrUrl = options.qrCodeUrl?.trim() || (typeof window !== 'undefined' ? window.location.href : '');

    if (shouldIncludeQr && !qrDataUrl && targetQrUrl) {
      try {
        qrDataUrl = await QRCode.toDataURL(targetQrUrl, {
          width: 240,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
      } catch (err) {
        console.warn('Could not generate verification QR code:', err);
      }
    }

    for (let page = 1; page <= totalPages; page++) {
      pdf.setPage(page);

      // 1. Watermark stamping
      if (shouldWatermark && watermarkText) {
        pdf.saveGraphicsState();
        try {
          let hasGState = false;
          try {
            if (typeof (pdf as any).GState === 'function') {
              pdf.setGState(new (pdf as any).GState({ opacity: watermarkOpacity }));
              hasGState = true;
            }
          } catch {
            hasGState = false;
          }
          pdf.setFont('helvetica', 'bold');
          // Scale font size based on text length to fit nicely on A4 page
          const calculatedSize = Math.max(22, Math.min(46, Math.floor(560 / watermarkText.length)));
          pdf.setFontSize(calculatedSize);
          if (hasGState) {
            pdf.setTextColor(isPrintMode ? 100 : 190, isPrintMode ? 116 : 205, isPrintMode ? 139 : 220);
          } else {
            // High-lightness color fallback for opacity emulation if GState is not available
            const grayVal = isPrintMode ? Math.round(255 - watermarkOpacity * 180) : Math.round(30 + watermarkOpacity * 200);
            pdf.setTextColor(grayVal, grayVal, grayVal);
          }
          pdf.text(watermarkText.toUpperCase(), pdfWidth / 2, pdfHeight / 2, {
            align: 'center',
            angle: watermarkAngle
          });
        } catch (e) {
          console.warn('Could not apply watermark graphics state:', e);
        } finally {
          pdf.restoreGraphicsState();
        }
      }

      // 2. Running Header & Footer Stamping
      if (options.includeRunningHeader !== false && (displayProject || displayCompany || displayTitle)) {
        pdf.saveGraphicsState();
        try {
          // Running Header
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(isPrintMode ? 100 : 160, isPrintMode ? 116 : 175, isPrintMode ? 139 : 190);

          const headerLeft = [displayProject, displayCompany].filter(Boolean).join(' • ');
          if (headerLeft) {
            pdf.text(headerLeft, 10, 6.5);
          }
          if (displayTitle) {
            const headerRightOffset = (shouldIncludeQr && options.qrCodePosition === 'header-right') ? 24 : 10;
            pdf.text(displayTitle, pdfWidth - headerRightOffset, 6.5, { align: 'right' });
          }

          // Top divider hairline
          pdf.setDrawColor(isPrintMode ? 220 : 60, isPrintMode ? 226 : 70, isPrintMode ? 235 : 90);
          pdf.setLineWidth(0.2);
          pdf.line(10, 8, pdfWidth - 10, 8);

          // Running Footer
          pdf.line(10, pdfHeight - 8, pdfWidth - 10, pdfHeight - 8);
          const footerLeft = [displayEngineer ? `Eng: ${displayEngineer}` : '', 'CKY_MEPF Engineering Calculation Suite'].filter(Boolean).join(' • ');
          const footerLeftX = (shouldIncludeQr && options.qrCodePosition === 'footer-left') ? 24 : 10;
          pdf.text(footerLeft, footerLeftX, pdfHeight - 4.5);

          // Page number offset to avoid overlapping footer QR code
          const pageNumRightOffset = (shouldIncludeQr && (options.qrCodePosition ?? 'footer-right') === 'footer-right') ? 26 : 10;
          pdf.text(`Page ${page} of ${totalPages}`, pdfWidth - pageNumRightOffset, pdfHeight - 4.5, { align: 'right' });
        } catch (e) {
          console.warn('Could not apply header/footer stamping:', e);
        } finally {
          pdf.restoreGraphicsState();
        }
      }

      // 3. Verification QR Code Stamping
      const qrAppliesToPage = (options.qrPages === 'first') ? (page === 1) : true;
      if (shouldIncludeQr && qrDataUrl && qrAppliesToPage) {
        pdf.saveGraphicsState();
        try {
          const qrPos = options.qrCodePosition || 'footer-right';
          const qrSize = 10; // 10mm x 10mm
          let qrX = pdfWidth - 21;
          let qrY = pdfHeight - 15;

          if (qrPos === 'footer-left') {
            qrX = 10;
            qrY = pdfHeight - 15;
          } else if (qrPos === 'header-right') {
            qrX = pdfWidth - 21;
            qrY = 2;
          }

          // Background card for crisp contrast
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(isPrintMode ? 200 : 70, isPrintMode ? 210 : 80, isPrintMode ? 220 : 100);
          pdf.setLineWidth(0.2);
          pdf.roundedRect(qrX - 0.8, qrY - 0.8, qrSize + 1.6, qrSize + 1.6, 0.8, 0.8, 'FD');

          pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

          // Micro label for verification context
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(4.5);
          pdf.setTextColor(isPrintMode ? 70 : 150, isPrintMode ? 85 : 165, isPrintMode ? 105 : 180);
          if (qrPos === 'header-right') {
            pdf.text('VERIFY', qrX + qrSize / 2, qrY + qrSize + 2.2, { align: 'center' });
          } else {
            pdf.text('VERIFY CALC', qrX + qrSize / 2, qrY - 1.2, { align: 'center' });
          }

          // Embedded interactive hyperlink in the PDF document
          if (targetQrUrl) {
            pdf.link(qrX - 0.8, qrY - 0.8, qrSize + 1.6, qrSize + 1.6, { url: targetQrUrl });
          }
        } catch (e) {
          console.warn('Could not stamp verification QR code:', e);
        } finally {
          pdf.restoreGraphicsState();
        }
      }
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  } finally {
    if (isPrintMode) {
      element.classList.remove('pdf-print-mode');
      element.classList.remove('app-theme-light');
      document.body.classList.remove('pdf-print-mode');
    }
    // Restore cross-origin stylesheet states
    crossOriginLinks.forEach(({ link, prevDisabled }) => {
      link.disabled = prevDisabled;
    });
    // Restore all hidden elements immediately to guarantee pristine UI state
    hiddenElements.forEach(({ el, prevDisplay }) => {
      el.style.display = prevDisplay;
    });
  }
};
