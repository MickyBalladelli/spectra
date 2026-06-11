import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Chip, Divider, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ShareIcon from '@mui/icons-material/Share'
import { apiDelete, apiGet, apiPost } from '../api/client.js'
import { EmptyState } from './EmptyState.jsx'

export function CollectionsView({ documents, collections, onChanged }) {
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [collectionDocuments, setCollectionDocuments] = useState([])
  const [documentId, setDocumentId] = useState('')
  const [shareUser, setShareUser] = useState('')
  const selected = useMemo(
    () => collections.find(collection => collection.id === selectedId) || null,
    [collections, selectedId]
  )
  const availableDocuments = useMemo(() => {
    const inCollection = new Set(collectionDocuments.map(document => document.id))
    return documents.filter(document => !inCollection.has(document.id))
  }, [documents, collectionDocuments])

  useEffect(() => {
    if (!selectedId && collections.length > 0) {
      setSelectedId(collections[0].id)
    }
  }, [collections, selectedId])

  useEffect(() => {
    if (!selectedId) {
      setCollectionDocuments([])
      return
    }

    apiGet(`/api/collections/${selectedId}/documents`)
      .then(setCollectionDocuments)
      .catch(() => setCollectionDocuments([]))
  }, [selectedId])

  async function create() {
    if (!name.trim()) return
    const collection = await apiPost('/api/collections', { name: name.trim() })
    setName('')
    setSelectedId(collection.id)
    await onChanged?.()
  }

  async function addDocument() {
    if (!selectedId || !documentId) return
    await apiPost(`/api/collections/${selectedId}/documents`, { documentId })
    setDocumentId('')
    setCollectionDocuments(await apiGet(`/api/collections/${selectedId}/documents`))
    await onChanged?.()
  }

  async function removeDocument(id) {
    await apiDelete(`/api/collections/${selectedId}/documents/${id}`)
    setCollectionDocuments(await apiGet(`/api/collections/${selectedId}/documents`))
    await onChanged?.()
  }

  async function share() {
    if (!selectedId || !shareUser.trim()) return
    await apiPost(`/api/collections/${selectedId}/shares`, { username: shareUser.trim() })
    setShareUser('')
    await onChanged?.()
  }

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            size="small"
            label="New collection"
            value={name}
            onChange={event => setName(event.target.value)}
            sx={{ width: { xs: '100%', md: 320 } }}
          />
          <Button startIcon={<AddIcon />} variant="contained" onClick={create} disabled={!name.trim()}>
            Create
          </Button>
        </Stack>
      </Paper>

      {collections.length === 0 ? (
        <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
          <EmptyState title="No collections yet" message="Create a collection to group documents" />
        </Paper>
      ) : (
        <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
          <Stack spacing={2}>
            <FormControl size="small" sx={{ width: { xs: '100%', md: 360 } }}>
              <InputLabel>Collection</InputLabel>
              <Select label="Collection" value={selectedId} onChange={event => setSelectedId(event.target.value)}>
                {collections.map(collection => (
                  <MenuItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selected && (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={selected.isOwner ? 'Owner' : `Shared by ${selected.ownerUserId}`} color={selected.isOwner ? 'primary' : 'default'} variant="outlined" />
                  <Chip label={`${collectionDocuments.length} documents`} />
                  {(selected.shares || []).map(user => <Chip key={user} label={`shared: ${user}`} variant="outlined" />)}
                </Stack>

                {selected.isOwner && (
                  <>
                    <Divider />
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <FormControl size="small" sx={{ width: { xs: '100%', md: 360 } }}>
                        <InputLabel>Add document</InputLabel>
                        <Select label="Add document" value={documentId} onChange={event => setDocumentId(event.target.value)}>
                          {availableDocuments.map(document => (
                            <MenuItem key={document.id} value={document.id}>{document.title}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button variant="outlined" onClick={addDocument} disabled={!documentId}>Add</Button>
                      <TextField size="small" label="Share with user" value={shareUser} onChange={event => setShareUser(event.target.value)} />
                      <Button startIcon={<ShareIcon />} variant="outlined" onClick={share} disabled={!shareUser.trim()}>Share</Button>
                    </Stack>
                  </>
                )}

                <Stack sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                  {collectionDocuments.length === 0 ? (
                    <Box sx={{ p: 2, color: 'text.secondary' }}>No documents in this collection</Box>
                  ) : collectionDocuments.map((document, index) => (
                    <Box key={document.id} sx={{ display: 'grid', gridTemplateColumns: selected.isOwner ? '1fr auto' : '1fr', gap: 2, p: 1.25, borderTop: index === 0 ? 0 : 1, borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{document.title}</Typography>
                      {selected.isOwner && <Button size="small" color="error" onClick={() => removeDocument(document.id)}>Remove</Button>}
                    </Box>
                  ))}
                </Stack>
              </Stack>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
