const fs = require('fs')
const { PDFParse } = require('pdf-parse')

async function main() {
  const filePath = process.argv[2]
  if (!filePath || !fs.existsSync(filePath)) {
    process.stderr.write('File not found: ' + filePath)
    process.exit(1)
  }

  const buf = fs.readFileSync(filePath)
  const parser = new PDFParse({ data: buf })
  const textResult = await parser.getText()
  await parser.destroy()
  process.stdout.write(textResult?.text || '')
}

main().catch((err) => {
  process.stderr.write(err?.message || String(err))
  process.exit(1)
})
