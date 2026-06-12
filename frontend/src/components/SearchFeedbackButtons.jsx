import { IconButton, Stack, Tooltip } from '@mui/material'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'

export function SearchFeedbackButtons({ value, onChange }) {
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Good result">
        <IconButton
          size="small"
          color={value === 'good' ? 'success' : 'default'}
          onClick={event => {
            event.stopPropagation()
            onChange('good')
          }}
        >
          <ThumbUpIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Bad result">
        <IconButton
          size="small"
          color={value === 'bad' ? 'error' : 'default'}
          onClick={event => {
            event.stopPropagation()
            onChange('bad')
          }}
        >
          <ThumbDownIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
