/**
 * Utilidad histórica para actualizar texto dentro de un PPTX. Trata el documento como ZIP y modifica XML de diapositivas; no participa en la ejecución de Gymbro.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const sourcePath = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);

const replacements = new Map([
  [
    "Node.js • PostgreSQL • React/TypeScript • Gemini API",
    "Angular/TypeScript • Node.js/JavaScript • PostgreSQL + Prisma ORM • Gemini API",
  ],
  ["• PostgreSQL normalizado", "• PostgreSQL + Prisma ORM"],
]);

/** Abre el PPTX, aplica reemplazos de texto en XML y escribe el documento de salida. */
async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(sourcePath));
  const slideNames = Object.keys(zip.files).filter((name) =>
    /^ppt\/slides\/slide\d+\.xml$/.test(name),
  );

  const applied = new Map([...replacements.keys()].map((key) => [key, 0]));

  for (const slideName of slideNames) {
    let xml = await zip.file(slideName).async("string");
    for (const [from, to] of replacements) {
      if (xml.includes(from)) {
        xml = xml.replaceAll(from, to);
        applied.set(from, applied.get(from) + 1);
      }
    }
    zip.file(slideName, xml);
  }

  for (const [text, count] of applied) {
    if (count !== 1) {
      throw new Error(`Expected one occurrence of "${text}", found ${count}`);
    }
  }

  const output = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  fs.writeFileSync(outputPath, output);
  console.log(`Updated presentation written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
