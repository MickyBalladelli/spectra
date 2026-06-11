import { Box } from '@mui/material'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getQueryTerms(query) {
  return Array.from(new Set(
    query
      .trim()
      .split(/\s+/)
      .map(term => term.replace(/[^\p{L}\p{N}_-]/gu, ''))
      .filter(term => term.length > 1)
  ))
}

export function HighlightedText({ text, query }) {
  const terms = getQueryTerms(query)

  if (terms.length === 0) return text

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'giu')
  const parts = String(text || '').split(pattern)

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = terms.some(term => term.toLowerCase() === part.toLowerCase())

        if (!isMatch) return part

        return (
          <Box
            component="mark"
            key={`${part}-${index}`}
            sx={{
              bgcolor: 'warning.light',
              color: 'warning.contrastText',
              borderRadius: 0.5,
              px: 0.4
            }}
          >
            {part}
          </Box>
        )
      })}
    </>
  )
}
