// Streams one .xlsx file: fixed workbook parts plus one worksheet whose rows
// arrive as XML from the engine.

import { Zip, ZipDeflate, strToU8 } from "fflate";
import type { Sink } from "./sinks";

const NS = "http://schemas.openxmlformats.org";
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const STATIC: [string, string][] = [
  [
    "[Content_Types].xml",
    `${XML}<Types xmlns="${NS}/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      `</Types>`,
  ],
  [
    "_rels/.rels",
    `${XML}<Relationships xmlns="${NS}/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
  ],
  [
    "xl/workbook.xml",
    `${XML}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships">` +
      `<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  ],
  [
    "xl/_rels/workbook.xml.rels",
    `${XML}<Relationships xmlns="${NS}/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `<Relationship Id="rId2" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`,
  ],
  [
    "xl/styles.xml",
    `${XML}<styleSheet xmlns="${NS}/spreadsheetml/2006/main">` +
      `<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`,
  ],
];

function sheetHead(frozenHeader: boolean): string {
  const pane = frozenHeader
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : "";
  return `${XML}<worksheet xmlns="${NS}/spreadsheetml/2006/main">${pane}<sheetData>`;
}

const SHEET_TAIL = "</sheetData></worksheet>";

export class XlsxPart {
  private zip = new Zip();
  private sheet = new ZipDeflate("xl/worksheets/sheet1.xml", { level: 1 });
  private pending: Uint8Array[] = [];
  private failure: Error | null = null;

  /** `headerXml` is the header row as spreadsheet XML (row 1), or null. */
  constructor(
    private sink: Sink,
    headerXml: Uint8Array | null,
  ) {
    this.zip.ondata = (err, chunk) => {
      if (err) this.failure = err;
      else this.pending.push(chunk);
    };
    for (const [name, xml] of STATIC) {
      const f = new ZipDeflate(name, { level: 6 });
      this.zip.add(f);
      f.push(strToU8(xml), true);
    }
    this.zip.add(this.sheet);
    this.sheet.push(strToU8(sheetHead(headerXml !== null)));
    if (headerXml) this.sheet.push(headerXml);
  }

  async write(rowsXml: Uint8Array): Promise<void> {
    if (rowsXml.length) this.sheet.push(rowsXml);
    await this.drain();
  }

  async finish(): Promise<void> {
    this.sheet.push(strToU8(SHEET_TAIL), true);
    this.zip.end();
    await this.drain();
    await this.sink.close();
  }

  private async drain(): Promise<void> {
    if (this.failure) throw this.failure;
    for (const chunk of this.pending.splice(0)) await this.sink.write(chunk);
  }
}
