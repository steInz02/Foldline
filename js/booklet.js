// Each physical sheet has two slots per side. Sheet 0 wraps the whole stack.
function sheetPair(pageCount, sheet, back) {
  const padded = 4 * Math.ceil(pageCount / 4);
  const offset = 2 * sheet;
  const numbers = back ? [2 + offset, padded - 1 - offset] : [padded - offset, 1 + offset];
  return numbers.map(n => n > pageCount ? null : n);
}

const paperSizes = { A4: [841.89, 595.28], Letter: [792, 612] };

async function makeBooklet(pages, size) {
  const pdf = await PDFLib.PDFDocument.create();
  pdf.setTitle('Foldline booklet');
  const [width, height] = paperSizes[size];
  for (let sheet = 0; sheet < Math.ceil(pages.length / 4); sheet++) {
    for (const back of [false, true]) {
      const face = pdf.addPage([width, height]);
      const pair = sheetPair(pages.length, sheet, back);
      for (const [slot, number] of pair.entries()) {
        if (!number) continue;
        const page = pages[number - 1];
        const response = await fetch(page.src);
        if (!response.ok) throw new Error('Missing page image');
        const bytes = await response.arrayBuffer();
        const image = page.jpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
        const scale = Math.min(width / 2 / image.width, height / image.height);
        const w = image.width * scale, h = image.height * scale;
        face.drawImage(image, {x: slot * width / 2 + (width / 2 - w) / 2,
          y: (height - h) / 2, width: w, height: h});
      }
    }
  }
  return pdf.save();
}
