import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  orientation: 'landscape' | 'portrait' = 'landscape'
) {
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 2x for sharp print quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Fit canvas in A4
    const imgWidth = pageWidth - 16; // 8mm margin each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const yPos = imgHeight > pageHeight ? 8 : (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', 8, Math.max(8, yPos), imgWidth, Math.min(imgHeight, pageHeight - 16));
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Failed to export PDF', error);
    return false;
  }
}

export async function exportMultipleElementsToPdf(
  elements: { element: HTMLElement; title: string }[],
  filename: string,
  orientation: 'landscape' | 'portrait' = 'landscape'
) {
  try {
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < elements.length; i++) {
      const { element } = elements[i];
      if (i > 0) {
        pdf.addPage();
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 16;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const yPos = imgHeight > pageHeight ? 8 : (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', 8, Math.max(8, yPos), imgWidth, Math.min(imgHeight, pageHeight - 16));
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Failed to bulk export PDF', error);
    return false;
  }
}
