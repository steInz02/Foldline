# Verification report

The build ran in Chromium against a local static preview. The exported files were also opened and inspected with PyMuPDF and Pillow.

| Check | Observed result |
| --- | --- |
| Example and keyboard | Loaded the 12-page Pond notes sample. Activated the example, then pressed Enter on the focused fold control. The folded view reported page 1. |
| Navigation | Selected Back, then the next sheet. The display showed page 4 on the left and 9 on the right. |
| A4 PDF | Download completed. All 12 embedded images matched the source artwork pixel for pixel. Their left/right placements matched the six expected page pairs. |
| Personal booklet | Imported five PNGs as one batch. The app showed two sheets and three blank slots. |
| Save and restore | Moved the first page later, reloaded the page, and verified that the second image had become page 1 and all five pages remained. |
| US Letter PDF | Exported the reordered draft. The PDF had four landscape sides, a width of 792 points, and five embedded page images. |
| Invalid import | Tried a corrupt PNG. The app reported the cancelled import and kept the saved five-page draft. |
| Phone layout | Ran the app inside a 390 × 844 browser frame. The body and scrollable content both measured 375 CSS pixels after the scrollbar. The fold control worked. |

Physical printing, printer-driver alignment, Safari on an iPhone, storage-quota exhaustion and a live GitHub Pages deployment were not tested. PDF geometry and page order were checked digitally. For the first physical run, print just the first two PDF sides on one sheet to confirm your printer’s duplex orientation.
