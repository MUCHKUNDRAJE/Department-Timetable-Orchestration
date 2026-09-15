import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

const CAPTURE_WIDTH = 1200; // Fixed render width — matches the standard sheet max-w-[1200px]

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
 * Captures a specific section (identified by data-section attribute) of an element.
 * The clone is rendered at full sheet width so layout is stable, then only the
 * target section node is captured as a PNG.
 */
async function captureElementSection(
  element: HTMLElement,
  sectionAttr: string
): Promise<{ dataUrl: string; w: number; h: number }> {
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
  clone.style.padding = '16px';
  container.appendChild(clone);
  document.body.appendChild(container);

  await new Promise((r) => setTimeout(r, 220));
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  // Find the labelled section inside the clone
  const sectionEl = clone.querySelector(`[data-section="${sectionAttr}"]`) as HTMLElement | null;
  const targetEl: HTMLElement = sectionEl || clone;

  const w = targetEl.scrollWidth || CAPTURE_WIDTH;
  const h = targetEl.scrollHeight;

  const dataUrl = await toPng(targetEl, {
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
 * Helper: adds one captured image to the current PDF page with margin + footer watermark.
 */
function addImagePage(
  pdf: jsPDF,
  dataUrl: string,
  imgW: number,
  imgH: number,
  footerLabel?: string
) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 6;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2 - 5; // 5mm footer reserve

  const scale = Math.min(availableWidth / imgW, availableHeight / imgH);
  const renderWidth = imgW * scale;
  const renderHeight = imgH * scale;
  const offsetX = margin + (availableWidth - renderWidth) / 2;
  const offsetY = margin + (availableHeight - renderHeight) / 2;

  pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');

  // Footer watermark
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(140, 145, 160);
  const footerText = footerLabel
    ? `Timetable Allocator · ${footerLabel}`
    : 'Timetable Allocator · Created by Muchkundraje Thote';
  pdf.text(footerText, pageWidth / 2, pageHeight - 2.5, { align: 'center' });
}

/**
 * High-fidelity Snapshot-based PDF Exporter.
 *
 * twoPage = true  (default): Page 1 = timetable grid, Page 2 = labels/reference section.
 * twoPage = false           : Whole sheet on one A4 landscape page.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  orientation: 'landscape' | 'portrait' = 'landscape',
  twoPage = true
) {
  try {
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    if (twoPage) {
      // Page 1: Timetable Grid
      const { dataUrl: gridUrl, w: gW, h: gH } = await captureElementSection(element, 'grid');
      addImagePage(pdf, gridUrl, gW, gH, 'Page 1 — Timetable Grid');

      // Page 2: Labels / Reference
      pdf.addPage();
      const { dataUrl: labelsUrl, w: lW, h: lH } = await captureElementSection(element, 'labels');
      addImagePage(pdf, labelsUrl, lW, lH, 'Page 2 — Subject & Faculty Reference');
    } else {
      const { dataUrl, w, h } = await captureElement(element);
      addImagePage(pdf, dataUrl, w, h);
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Snapshot PDF Export failed', error);
    return false;
  }
}

/**
 * Bulk Multi-page PDF Snapshot Exporter.
 *
 * twoPage = true  (default): Each entity gets 2 pages — grid + labels.
 * twoPage = false           : Each entity gets 1 page.
 */
export async function exportMultipleElementsToPdf(
  elements: { element: HTMLElement; title: string }[],
  filename: string,
  orientation: 'landscape' | 'portrait' = 'landscape',
  twoPage = true
) {
  try {
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    for (let i = 0; i < elements.length; i++) {
      const { element, title } = elements[i];
      if (i > 0) pdf.addPage();

      if (twoPage) {
        // Page A: Timetable grid
        const { dataUrl: gridUrl, w: gW, h: gH } = await captureElementSection(element, 'grid');
        addImagePage(pdf, gridUrl, gW, gH, `${title} · Page 1 — Timetable Grid`);

        // Page B: Labels / Reference
        pdf.addPage();
        const { dataUrl: labelsUrl, w: lW, h: lH } = await captureElementSection(element, 'labels');
        addImagePage(pdf, labelsUrl, lW, lH, `${title} · Page 2 — Subject & Faculty Reference`);
      } else {
        const { dataUrl, w, h } = await captureElement(element);
        addImagePage(pdf, dataUrl, w, h, title);
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
