function hashToken(token) {
  let hash = 0
  for (let i = 0; i < token.length; i += 1) {
    hash = ((hash << 5) - hash) + token.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function tokenize(text) {
  return Array.from(text.toLowerCase().matchAll(/\b[\p{L}\p{N}_]+\b/gu), match => match[0])
}

export function embedText(text, dimensions = 128) {
  const vector = Array.from({ length: dimensions }, () => 0)
  const tokens = tokenize(text)

  for (const token of tokens) {
    const bucket = Math.abs(hashToken(token)) % dimensions
    vector[bucket] += 1
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map(value => Number((value / magnitude).toFixed(6)))
}
