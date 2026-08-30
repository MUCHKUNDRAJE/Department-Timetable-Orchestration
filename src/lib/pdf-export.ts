import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

const CAPTURE_WIDTH = 1200; // Fixed render width — matches the sheet max-w-[1200px]

/**
 * Creates an off-screen clone of the element at a fixed pixel width so that
 * html-to-image always has stable, accurate scrollWidth/scrollHeight to capture.
 * Prevents clipping caused by the live element being inside a constrained container.
 */
async function captureElement(element: HTMLElement): Promise<{ dataUrl: string; w: number; h: number }> {
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'top:-99999px',
    'left:-99999px',
    `width:${CAPTURE_WIDTH}px`,
    'background:#ffffff',
    'z-index:-1',
    'pointer-events:none',
  ].join(';');

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.maxWidth = `${CAPTURE_WIDTH}px`;
  clone.style.width = `${CAPTURE_WIDTH}px`;
  clone.style.margin = '0';
  clone.style.borderRadius = '0';
  clone.style.border = 'none';
  clone.style.boxShadow = 'none';
  container.appendChild(clone);
  document.body.appendChild(container);

  // Allow layout to settle
  await new Promise((r) => setTimeout(r, 180));

  const w = clone.scrollWidth || CAPTURE_WIDTH;
  const h = clone.scrollHeight;

  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const dataUrl = await toPng(clone, {
    quality: 1.0,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
    canvasWidth: w,
    canvasHeight: h,
    width: w,
    height: h,
  });

  document.body.removeChild(container);
  return { dataUrl, w, h };
}

/**
 * High-fidelity Snapshot-based PDF Exporter.
 * Supports multi-page output when content is taller than a single A4 landscape page.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  orientation: 'landscape' | 'portrait' = 'landscape'
) {
  try {
    const { dataUrl, w, h } = await captureElement(element);

    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const scale = availableWidth / w;
    const scaledTotalHeight = h * scale;
    const totalPages = Math.ceil(scaledTotalHeight / availableHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Render full image shifted up so this page's slice is at the top
      pdf.addImage(
        dataUrl, 'PNG',
        margin, margin - page * availableHeight,
        availableWidth, scaledTotalHeight,
        undefined, 'FAST'
      );

      // White mask strips to clip content outside this page's visible slice
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, margin, 'F');
      pdf.rect(0, pageHeight - margin, pageWidth, margin, 'F');

      // PDF Watermark Footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(140, 145, 160);
      pdf.text(
        'Timetable Allocator · Created by Muchkundraje Thote',
        pageWidth / 2,
        pageHeight - 3.5,
        { align: 'center' }
      );
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Snapshot PDF Export failed', error);
    return false;
  }
}

/**
 * Bulk Multi-page PDF Snapshot Exporter — each entity gets its own page(s).
 */
export async function exportMultipleElementsToPdf(
  elements: { element: HTMLElement; title: string }[],
  filename: string,
  orientation: 'landscape' | 'portrait' = 'landscape'
) {
  try {
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    for (let i = 0; i < elements.length; i++) {
      const { element } = elements[i];
      if (i > 0) pdf.addPage();

      const { dataUrl, w, h } = await captureElement(element);

      const scale = availableWidth / w;
      const scaledTotalHeight = h * scale;
      const totalPages = Math.ceil(scaledTotalHeight / availableHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        pdf.addImage(
          dataUrl, 'PNG',
          margin, margin - page * availableHeight,
          availableWidth, scaledTotalHeight,
          undefined, 'FAST'
        );

        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, margin, 'F');
        pdf.rect(0, pageHeight - margin, pageWidth, margin, 'F');

        // PDF Watermark Footer
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(140, 145, 160);
        pdf.text(
          'Timetable Allocator · Created by Muchkundraje Thote',
          pageWidth / 2,
          pageHeight - 3.5,
          { align: 'center' }
        );
      }
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Bulk Snapshot PDF Export failed', error);
    return false;
  }
}

/**
 * Isolated high-fidelity direct browser print using a hidden iframe.
 */
export function printElementDirectly(element: HTMLElement) {
  try {
    const printFrame = document.createElement('iframe');
    // Must be non-zero width so content lays out correctly before printing
    printFrame.style.cssText = [
      'position:fixed',
      'top:-99999px',
      'left:-99999px',
      'width:1200px',
      'height:900px',
      'border:none',
      'visibility:hidden',
    ].join(';');

    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Timetable Print</title>
    ${headStyles}
    <style>
      @page { size: A4 landscape; margin: 10mm 12mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
      html, body { width: 100% !important; background: #ffffff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; }
      .print-sheet-root { width: 100% !important; max-width: 100% !important; margin: 0 auto !important; padding: 4mm 6mm !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; }
      table { width: 100% !important; table-layout: fixed !important; page-break-inside: avoid !important; }
      img { max-width: 100% !important; }
    </style>
  </head>
  <body>
    <div class="print-sheet-root">${element.outerHTML}</div>
  </body>
</html>`);
    doc.close();

    printFrame.contentWindow?.focus();
    setTimeout(() => {
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 3000);
    }, 800);
  } catch (err) {
    console.warn('Iframe print fallback to window.print', err);
    window.print();
  }
}
