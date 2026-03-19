import fs from "fs"
import { createRequire } from "module";
import mammoth from "mammoth"
import { PDFParse } from "pdf-parse";

const require = createRequire(import.meta.url);

export async function extractText(file:any) {
  const ext = file.originalname.split(".").pop()?.toLowerCase() || ""

  if (ext === "pdf") {
    const parser = new PDFParse({ data: fs.readFileSync(file.path) })
    const data = await parser.getText()
    await parser.destroy()
    return data.text
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ path: file.path })
    return result.value
  }

  if (ext === "txt") {
    return fs.readFileSync(file.path, "utf8")
  }
}