import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * High-fidelity Snapshot-based PDF Exporter using browser-native SVG foreignObject engine (html-to-image).
 * Captures pixel-perfect typography, badges, and tables without canvas clipping or font misalignments.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  orientation: 'landscape' | 'portrait' = 'landscape'
) {
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    // Measure full content dimensions (including content wider than viewport)
    const fullWidth = element.scrollWidth;
    const fullHeight = element.scrollHeight;

    // Capture direct snapshot using browser-native SVG rendering engine.
    // Explicitly set canvasWidth/canvasHeight to scrollWidth/scrollHeight
    // so html-to-image never clips the right or bottom edge.
    const imgData = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      canvasWidth: fullWidth,
      canvasHeight: fullHeight,
      width: fullWidth,
      height: fullHeight,
    });

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Create an Image element to get exact natural dimensions
    const img = new Image();
    img.src = imgData;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const margin = 10;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    // Scale to fit width; if too tall, scale to fit height instead
    let imgWidth = availableWidth;
    let imgHeight = (img.height * imgWidth) / img.width;

    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = (img.width * imgHeight) / img.height;
    }

    const xPos = margin + (availableWidth - imgWidth) / 2;
    const yPos = margin + (availableHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Snapshot PDF Export failed', error);
    return false;
  }
}

/**
 * Bulk Multi-page PDF Snapshot Exporter
 */
export async function exportMultipleElementsToPdf(
  elements: { element: HTMLElement; title: string }[],
  filename: string,
  orientation: 'landscape' | 'portrait' = 'landscape'
) {
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    for (let i = 0; i < elements.length; i++) {
      const { element } = elements[i];
      if (i > 0) {
        pdf.addPage();
      }

      const fullWidth = element.scrollWidth;
      const fullHeight = element.scrollHeight;

      const imgData = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        canvasWidth: fullWidth,
        canvasHeight: fullHeight,
        width: fullWidth,
        height: fullHeight,
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      let imgWidth = availableWidth;
      let imgHeight = (img.height * imgWidth) / img.width;
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = (img.width * imgHeight) / img.height;
      }

      const xPos = margin + (availableWidth - imgWidth) / 2;
      const yPos = margin + (availableHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Bulk Snapshot PDF Export failed', error);
    return false;
  }
}

/**
 * Isolated high-fidelity direct browser print using a hidden iframe
 */
export function printElementDirectly(element: HTMLElement) {
  try {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-99999px';
    printFrame.style.left = '-99999px';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';

    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Collect all stylesheet links and style tags from current document
    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Timetable Print - Yeshwantrao Chavan College of Engineering</title>
          ${headStyles}
          <style>
            @page {
              size: landscape;
              margin: 10mm 12mm;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-sheet-root {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 4mm 6mm !important;
              box-sizing: border-box !important;
              border: none !important;
              box-shadow: none !important;
            }
            table {
              width: 100% !important;
              table-layout: fixed !important;
            }
          </style>
        </head>
        <body>
          <div class="print-sheet-root">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    printFrame.contentWindow?.focus();
    setTimeout(() => {
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 2000);
    }, 500);
  } catch (err) {
    console.warn('Iframe print fallback to window.print', err);
    window.print();
  }
}
