/**
 * Download #print-report as a real PDF (no browser print dialog).
 * Uses the same @media print CSS by toggling a class on body.
 */
export async function downloadReportPdf(filename = "zakat-report.pdf") {
  const el = document.getElementById("print-report");
  if (!el) {
    window.print();
    return;
  }
  // Force visibility (override display:none from styles.css)
  const prevDisplay = el.style.display;
  const prevPosition = el.style.position;
  el.style.display = "block";
  el.style.position = "static";

  try {
    const mod = await import("html2pdf.js");
    const html2pdf = (mod as any).default ?? mod;
    await html2pdf()
      .from(el)
      .set({
        margin: [10, 8, 12, 8],
        filename,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .save();
  } finally {
    el.style.display = prevDisplay;
    el.style.position = prevPosition;
  }
}
