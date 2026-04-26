const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  TabStopType, TabStopPosition, PageNumber, PageBreak
} = require('docx');

// ══════════════════════════════════════════════
// P31 COURT DOCUMENT TEMPLATE
// Reusable caption + formatting for all filings
// Johnson v. Johnson, Civil Action No. 2025CV936
// ══════════════════════════════════════════════

const TEAL = "0D4F4F";
const CORAL = "E8636F";
const SLATE = "334155";
const LGRAY = "94A3B8";
const RULE = "CBD5E1";

// ── The Caption Generator ──
// Call this function at the start of every court document.
// Returns an array of Paragraph objects.
function courtCaption(docTitle) {
  const noBorder = { style: BorderStyle.NONE, size: 0 };
  const topBot = {
    top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    left: noBorder, right: noBorder
  };
  const noB = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const cm = { top: 40, bottom: 40, left: 80, right: 80 };

  function txt(text, opts = {}) {
    return new TextRun({ text, font: "Times New Roman", size: 24, ...opts });
  }

  function pCell(children, width, borders = noB, alignment = AlignmentType.LEFT) {
    return new TableCell({
      borders, width: { size: width, type: WidthType.DXA }, margins: cm,
      children: [new Paragraph({ alignment, children })]
    });
  }

  // Build the caption as a 2-column table for perfect alignment
  const captionTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [5500, 3860],
    rows: [
      // Top rule row
      new TableRow({ children: [
        pCell([], 5500, { ...noB, bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" } }),
        pCell([], 3860, { ...noB, bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" } }),
      ]}),
      // Blank )
      new TableRow({ children: [
        pCell([], 5500),
        pCell([txt(")")], 3860, noB, AlignmentType.LEFT),
      ]}),
      // CHRISTYN JOHNSON, Plaintiff )
      new TableRow({ children: [
        pCell([txt("CHRISTYN ELIZABETH JOHNSON,", { bold: true })], 5500),
        pCell([txt(")")], 3860),
      ]}),
      new TableRow({ children: [
        pCell([txt("          Plaintiff,", { italics: true })], 5500),
        pCell([txt(")")], 3860),
      ]}),
      // Blank )
      new TableRow({ children: [
        pCell([], 5500),
        pCell([txt(")")], 3860),
      ]}),
      // -vs-  ) Civil Action No.
      new TableRow({ children: [
        pCell([txt("     -vs-")], 5500),
        pCell([txt(")     ", { }), txt("Civil Action No. 2025CV936", { bold: true })], 3860),
      ]}),
      // Blank )
      new TableRow({ children: [
        pCell([], 5500),
        pCell([txt(")")], 3860),
      ]}),
      // WILLIAM JOHNSON, Defendant )
      new TableRow({ children: [
        pCell([txt("WILLIAM RODGER JOHNSON,", { bold: true })], 5500),
        pCell([txt(")")], 3860),
      ]}),
      new TableRow({ children: [
        pCell([txt("          Defendant.", { italics: true })], 5500),
        pCell([txt(")")], 3860),
      ]}),
      // Bottom rule row
      new TableRow({ children: [
        pCell([], 5500, { ...noB, top: { style: BorderStyle.SINGLE, size: 6, color: "000000" } }),
        pCell([], 3860, { ...noB, top: { style: BorderStyle.SINGLE, size: 6, color: "000000" } }),
      ]}),
    ]
  });

  const elements = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [txt("IN THE SUPERIOR COURT OF CAMDEN COUNTY", { bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [txt("STATE OF GEORGIA", { bold: true })]
    }),
    captionTable,
  ];

  // Add document title if provided
  if (docTitle) {
    elements.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
    elements.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [txt(docTitle, { bold: true, underline: {} })]
    }));
  }

  return elements;
}

// ── Standard signature block ──
function signatureBlock(date = "14th day of April, 2026") {
  function txt(text, opts = {}) {
    return new TextRun({ text, font: "Times New Roman", size: 24, ...opts });
  }
  return [
    new Paragraph({ spacing: { before: 480 }, children: [txt(`Respectfully submitted this ${date}.`)] }),
    new Paragraph({ spacing: { before: 600 }, children: [txt("_______________________________")] }),
    new Paragraph({ children: [txt("WILLIAM RODGER JOHNSON, Pro Se", { bold: true })] }),
    new Paragraph({ children: [txt("401 Powder Horn Rd")] }),
    new Paragraph({ children: [txt("Saint Marys, Georgia 31558")] }),
    new Paragraph({ children: [txt("(912) 227-4980")] }),
    new Paragraph({ spacing: { after: 240 }, children: [txt("willyj1587@gmail.com")] }),
  ];
}

// ── Certificate of service ──
function certOfService(date = "14th day of April, 2026") {
  function txt(text, opts = {}) {
    return new TextRun({ text, font: "Times New Roman", size: 24, ...opts });
  }
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 240 },
      children: [txt("CERTIFICATE OF SERVICE", { bold: true })]
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [txt(
        "I hereby certify that I have this day served a copy of the foregoing upon " +
        "Plaintiff\u2019s counsel of record, Jennifer L. McGhan, Esq., McGhan Law, LLC, " +
        "575 E. King Avenue, Kingsland, Georgia 31548, via electronic mail to jenn@mcghanlaw.com."
      )]
    }),
    new Paragraph({ children: [txt(`This ${date}.`)] }),
    new Paragraph({ spacing: { before: 480 }, children: [txt("_______________________________")] }),
    new Paragraph({ children: [txt("William R. Johnson, Pro Se")] }),
  ];
}

// ── Standard footer ──
function courtFooter() {
  return new Footer({
    children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 2, color: RULE, space: 1 } },
      children: [
        new TextRun({ text: "Johnson v. Johnson \u2014 Civil Action No. 2025CV936 \u2014 Camden County Superior Court", font: "Times New Roman", size: 16, color: LGRAY }),
        new TextRun({ text: "\tPage ", font: "Times New Roman", size: 16, color: LGRAY }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Times New Roman", size: 16, color: LGRAY }),
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }]
    })]
  });
}

// ══════════════════════════════════════════════
// DEMO: Generate a blank template
// ══════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 24 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    footers: { default: courtFooter() },
    children: [
      ...courtCaption("DEFENDANT'S MOTION FOR [TITLE]"),
      new Paragraph({ spacing: { before: 240 }, children: [
        new TextRun({ text: "COMES NOW Defendant, WILLIAM RODGER JOHNSON, pro se, and respectfully moves this Court for...", font: "Times New Roman", size: 24 })
      ]}),
      ...signatureBlock(),
      ...certOfService(),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/Court_Document_Template.docx', buffer);
  console.log('Generated: Court_Document_Template.docx');
});

// Export for reuse
module.exports = { courtCaption, signatureBlock, certOfService, courtFooter };
