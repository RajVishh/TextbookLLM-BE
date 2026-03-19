import fs from "fs"
import { createRequire } from "module";
import mammoth from "mammoth"

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function extractText(file:any) {
  const ext = file.originalname.split(".").pop()?.toLowerCase() || ""

  if (ext === "pdf") {
    const data = await pdfParse(fs.readFileSync(file.path))
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