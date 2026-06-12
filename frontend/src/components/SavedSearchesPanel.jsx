import { useEffect, useState } from 'react'
import { Button, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Stack, TextField } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import { apiDelete, apiGet, apiPost } from '../api/client.js'

export function SavedSearchesPanel({ config, onLoad, disabled }) {
  const [savedSearches, setSavedSearches] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState('')

  async function loadSavedSearches() {
    if (disabled) return
    setSavedSearches(await apiGet('/api/saved-searches'))
  }

  useEffect(() => {
    loadSavedSearches().catch(() => {})
  }, [disabled])

  async function saveSearch() {
    const saved = await apiPost('/api/saved-searches', {
      name: name.trim() || config.query,
      config
    })
    setSavedSearches(current => [saved, ...current])
    setSelectedId(saved.id)
    setName('')
  }

  async function deleteSearch() {
    if (!selectedId) return

    await apiDelete(`/api/saved-searches/${selectedId}`)
    setSavedSearches(current => current.filter(search => search.id !== selectedId))
    setSelectedId('')
  }

  function loadSearch(id) {
    setSelectedId(id)
    const saved = savedSearches.find(search => search.id === id)
    if (saved) onLoad(saved.config)
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <FormControl size="small" fullWidth>
          <InputLabel>Saved searches</InputLabel>
          <Select
            label="Saved searches"
            value={selectedId}
            onChange={event => loadSearch(event.target.value)}
            disabled={disabled}
          >
            <MenuItem value="">Choose saved search</MenuItem>
            {savedSearches.map(search => (
              <MenuItem key={search.id} value={search.id}>{search.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            size="small"
            label="Save as"
            value={name}
            onChange={event => setName(event.target.value)}
            disabled={disabled}
            sx={{ flex: 1 }}
          />
          <Button
            startIcon={<SaveIcon />}
            variant="contained"
            onClick={saveSearch}
            disabled={disabled || !config.query}
          >
            Save
          </Button>
          <IconButton
            aria-label="Delete saved search"
            onClick={deleteSearch}
            disabled={disabled || !selectedId}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  )
}
