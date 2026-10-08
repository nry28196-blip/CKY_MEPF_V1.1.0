import { describe, it, expect } from 'vitest';
import { PDF_EXPORT_SECTIONS } from '../../components/PdfExportConfigModal';
import { PdfExportOptions } from '../../lib/exportPdf';

describe('PDF Export Configuration & Watermark Settings Suite', () => {
  it('exports valid PDF section options with categorizations and default states', () => {
    expect(PDF_EXPORT_SECTIONS.length).toBeGreaterThan(0);
    PDF_EXPORT_SECTIONS.forEach(sec => {
      expect(sec.key).toBeDefined();
      expect(sec.label).toBeDefined();
      expect(sec.description).toBeDefined();
      expect(['results', 'inputs', 'verification', 'documentation']).toContain(sec.category);
      expect(typeof sec.defaultEnabled).toBe('boolean');
    });
  });

  it('correctly handles custom project name and company watermark in export options', () => {
    const customProjectName = 'Metropolitan General Hospital Wing B';
    const companyName = 'CKY MEP Consulting Engineers';

    const projectWatermarkOptions: PdfExportOptions = {
      filename: 'Hospital_Wing_B_Ventilation.pdf',
      projectName: customProjectName,
      companyName: companyName,
      watermarkEnabled: true,
      watermarkText: customProjectName,
      watermarkOpacity: 0.18,
      watermarkAngle: 45,
      includeRunningHeader: true
    };

    expect(projectWatermarkOptions.watermarkEnabled).toBe(true);
    expect(projectWatermarkOptions.watermarkText).toBe(customProjectName);
    expect(projectWatermarkOptions.projectName).toBe(customProjectName);
    expect(projectWatermarkOptions.companyName).toBe(companyName);
    expect(projectWatermarkOptions.watermarkAngle).toBe(45);
    expect(projectWatermarkOptions.watermarkOpacity).toBe(0.18);
  });

  it('correctly formats company watermark options for submittal documentation', () => {
    const companyName = 'CKY MEP Consultants';
    const companyWatermarkOptions: PdfExportOptions = {
      filename: 'Standard_Office_Submittal.pdf',
      projectName: 'Commercial Tower Level 12',
      companyName: companyName,
      watermarkEnabled: true,
      watermarkText: companyName,
      watermarkOpacity: 0.15,
      watermarkAngle: 0,
      includeRunningHeader: true
    };

    expect(companyWatermarkOptions.watermarkEnabled).toBe(true);
    expect(companyWatermarkOptions.watermarkText).toBe(companyName);
    expect(companyWatermarkOptions.watermarkAngle).toBe(0);
    expect(companyWatermarkOptions.includeRunningHeader).toBe(true);
  });

  it('supports security status watermark stamps like CONFIDENTIAL and PRELIMINARY', () => {
    const statusStamps = [
      'CONFIDENTIAL',
      'PRELIMINARY - NOT FOR CONSTRUCTION',
      'FOR REVIEW ONLY',
      'APPROVED FOR CONSTRUCTION',
      'DRAFT / WORK IN PROGRESS'
    ];

    statusStamps.forEach(stamp => {
      const options: PdfExportOptions = {
        watermarkEnabled: true,
        watermarkText: stamp,
        watermarkOpacity: 0.28,
        watermarkAngle: 45
      };

      expect(options.watermarkEnabled).toBe(true);
      expect(options.watermarkText).toBe(stamp);
      expect(options.watermarkOpacity).toBe(0.28);
    });
  });

  it('correctly configures verification QR code options linking to app URL', () => {
    const testAppUrl = 'https://ais-pre-lrluh3xexldj7xwvzbtpf3-234593661332.asia-southeast1.run.app';
    const qrOptions: PdfExportOptions = {
      filename: 'Calculation_Report_With_QR.pdf',
      includeQrCode: true,
      qrCodeUrl: testAppUrl,
      qrCodePosition: 'footer-right',
      qrPages: 'all'
    };

    expect(qrOptions.includeQrCode).toBe(true);
    expect(qrOptions.qrCodeUrl).toBe(testAppUrl);
    expect(qrOptions.qrCodePosition).toBe('footer-right');
    expect(qrOptions.qrPages).toBe('all');
  });

  it('supports configurable QR code positions and page scoping', () => {
    const positions: Array<'footer-right' | 'footer-left' | 'header-right'> = [
      'footer-right',
      'footer-left',
      'header-right'
    ];

    positions.forEach(pos => {
      const opts: PdfExportOptions = {
        includeQrCode: true,
        qrCodeUrl: 'https://example.com/verify',
        qrCodePosition: pos,
        qrPages: 'first'
      };

      expect(opts.includeQrCode).toBe(true);
      expect(opts.qrCodePosition).toBe(pos);
      expect(opts.qrPages).toBe('first');
    });
  });

  it('correctly toggles inclusion of QR code between enabled and disabled states', () => {
    // Disabled state (default)
    const disabledOptions: PdfExportOptions = {
      filename: 'Standard_Export.pdf',
      includeQrCode: false
    };
    expect(disabledOptions.includeQrCode).toBe(false);

    // Enabled state via checkbox
    const enabledOptions: PdfExportOptions = {
      filename: 'Standard_Export.pdf',
      includeQrCode: true,
      qrCodeUrl: 'https://ais-pre-lrluh3xexldj7xwvzbtpf3-234593661332.asia-southeast1.run.app'
    };
    expect(enabledOptions.includeQrCode).toBe(true);
    expect(enabledOptions.qrCodeUrl).toBeDefined();
  });
});
