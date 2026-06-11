import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'

export const emptyObservabilityFilters = {
  type: 'all',
  status: '',
  dateFrom: '',
  dateTo: '',
  user: ''
}

export function ObservabilityFilters({ filters, onChange, onDownload }) {
  function updateFilter(name, value) {
    onChange({
      ...filters,
      [name]: value
    })
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="observability-type-label">Type</InputLabel>
          <Select
            labelId="observability-type-label"
            label="Type"
            value={filters.type}
            onChange={event => updateFilter('type', event.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="request">Request</MenuItem>
            <MenuItem value="job">Job</MenuItem>
            <MenuItem value="worker">Worker</MenuItem>
            <MenuItem value="error">Error</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Status"
          value={filters.status}
          onChange={event => updateFilter('status', event.target.value)}
          sx={{ minWidth: 140 }}
        />
        <TextField
          size="small"
          label="From"
          type="datetime-local"
          value={filters.dateFrom}
          onChange={event => updateFilter('dateFrom', event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="To"
          type="datetime-local"
          value={filters.dateTo}
          onChange={event => updateFilter('dateTo', event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="User"
          value={filters.user}
          onChange={event => updateFilter('user', event.target.value)}
          sx={{ minWidth: 180 }}
        />
        <Button
          variant="outlined"
          onClick={() => onChange(emptyObservabilityFilters)}
          sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
        >
          Reset
        </Button>
        <Button
          startIcon={<DownloadIcon />}
          variant="contained"
          onClick={onDownload}
          sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
        >
          Download
        </Button>
      </Stack>
    </Paper>
  )
}
