import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { buildContractBlocks } from './contractTemplate';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const MARGIN_BOTTOM = 64;
const HEADER_HEIGHT = 118;
const CONTINUATION_TOP = 50;

const DARK_GREEN = rgb(15 / 255, 45 / 255, 36 / 255);
const GOLD = rgb(200 / 255, 168 / 255, 105 / 255);
const CREAM = rgb(247 / 255, 245 / 255, 240 / 255);
const BODY_COLOR = rgb(60 / 255, 74 / 255, 56 / 255);

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateContractPdf(client) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logoImage = null;
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), 'assets', 'logo-mark.png'));
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch {
    logoImage = null;
  }

  const contentWidth = PAGE_WIDTH - MARGIN_X * 2;

  let page = null;
  let y = 0;
  let pageNumber = 0;

  function addPage(isFirst) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber += 1;
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: CREAM });

    if (isFirst) {
      page.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_HEIGHT, width: PAGE_WIDTH, height: HEADER_HEIGHT, color: DARK_GREEN });
      if (logoImage) {
        const logoDims = logoImage.scale(36 / logoImage.height);
        page.drawImage(logoImage, {
          x: PAGE_WIDTH / 2 - logoDims.width / 2,
          y: PAGE_HEIGHT - 56,
          width: logoDims.width,
          height: logoDims.height,
        });
      }
      page.drawText('ROCHELLE GONÇALVES', {
        x: PAGE_WIDTH / 2 - boldFont.widthOfTextAtSize('ROCHELLE GONÇALVES', 15) / 2,
        y: PAGE_HEIGHT - 78,
        size: 15,
        font: boldFont,
        color: CREAM,
      });
      page.drawText('RITMO PARA A GESTÃO', {
        x: PAGE_WIDTH / 2 - regularFont.widthOfTextAtSize('RITMO PARA A GESTÃO', 8) / 2,
        y: PAGE_HEIGHT - 94,
        size: 8,
        font: regularFont,
        color: GOLD,
      });
      y = PAGE_HEIGHT - HEADER_HEIGHT - 36;
    } else {
      page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 4, width: PAGE_WIDTH, height: 4, color: GOLD });
      y = PAGE_HEIGHT - CONTINUATION_TOP;
    }

    page.drawText('contato@rochellegoncalves.com.br  ·  (19) 99939-9744  ·  www.rochellegoncalves.com.br', {
      x: MARGIN_X,
      y: 34,
      size: 7,
      font: regularFont,
      color: BODY_COLOR,
    });
    page.drawText(String(pageNumber), {
      x: PAGE_WIDTH - MARGIN_X - regularFont.widthOfTextAtSize(String(pageNumber), 7),
      y: 34,
      size: 7,
      font: regularFont,
      color: BODY_COLOR,
    });
  }

  function ensureSpace(neededHeight) {
    if (y - neededHeight < MARGIN_BOTTOM) {
      addPage(false);
    }
  }

  addPage(true);

  for (const block of buildContractBlocks(client)) {
    if (block.type === 'title') {
      const size = 15;
      const lines = wrapText(block.text, boldFont, size, contentWidth);
      ensureSpace(lines.length * (size + 6) + 20);
      y -= 10;
      for (const line of lines) {
        page.drawText(line, {
          x: PAGE_WIDTH / 2 - boldFont.widthOfTextAtSize(line, size) / 2,
          y,
          size,
          font: boldFont,
          color: DARK_GREEN,
        });
        y -= size + 6;
      }
      y -= 14;
    } else if (block.type === 'heading') {
      const size = 11;
      ensureSpace(size + 20);
      y -= 8;
      page.drawText(block.text, { x: MARGIN_X, y, size, font: boldFont, color: DARK_GREEN });
      y -= size + 10;
    } else if (block.type === 'paragraph') {
      const size = 9.5;
      const lineHeight = 14;
      const lines = wrapText(block.text, regularFont, size, contentWidth);
      for (const line of lines) {
        ensureSpace(lineHeight);
        page.drawText(line, { x: MARGIN_X, y, size, font: regularFont, color: BODY_COLOR });
        y -= lineHeight;
      }
      y -= 6;
    } else if (block.type === 'signature') {
      ensureSpace(70);
      y -= 30;
      page.drawLine({
        start: { x: MARGIN_X, y },
        end: { x: MARGIN_X + 220, y },
        thickness: 1,
        color: BODY_COLOR,
      });
      y -= 16;
      page.drawText(block.label, { x: MARGIN_X, y, size: 10, font: boldFont, color: DARK_GREEN });
      y -= 14;
      page.drawText(block.role, { x: MARGIN_X, y, size: 9, font: boldFont, color: BODY_COLOR });
      y -= 20;
    }
  }

  return pdfDoc.save();
}
