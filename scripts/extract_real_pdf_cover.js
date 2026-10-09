const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function extractCover() {
  console.log('Extracting real cover from PDF...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 1200 } });
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    </head>
    <body style="margin:0; background:transparent;">
      <canvas id="pdf-canvas"></canvas>
    </body>
    </html>
  `);
  
  const pdfPath = path.join(__dirname, '../public/documents/dinh_duong_hoc_bi_that_truyen_goc.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);
  const base64 = pdfBytes.toString('base64');
  
  await page.evaluate(async (b64) => {
    const raw = atob(b64);
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }
    
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
    });
    const pdf = await loadingTask.promise;
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 2.0 });
    const canvas = document.getElementById('pdf-canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page1.render({ canvasContext: ctx, viewport }).promise;
  }, base64);
  
  const canvasHandle = await page.$('#pdf-canvas');
  const outPath = path.join(__dirname, '../public/documents/covers/cover_dinh_duong_hoc_that_truyen.png');
  await canvasHandle.screenshot({ path: outPath });
  console.log('Successfully saved real cover to:', outPath);
  await browser.close();
}

extractCover().catch((err) => {
  console.error('Error extracting cover:', err);
  process.exit(1);
});
