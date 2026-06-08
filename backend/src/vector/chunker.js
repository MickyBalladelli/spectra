export function chunkText(text, size = 700) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)

  const chunks = []
  let buffer = ''

  for (const paragraph of paragraphs.length > 0 ? paragraphs : [text]) {
    if (`${buffer}\n\n${paragraph}`.length > size && buffer.length > 0) {
      chunks.push(buffer)
      buffer = paragraph
    } else {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph
    }
  }

  if (buffer) chunks.push(buffer)

  return chunks.map((content, index) => ({
    chunkIndex: index,
    content,
    tokenCount: content.split(/\s+/).filter(Boolean).length
  }))
}
