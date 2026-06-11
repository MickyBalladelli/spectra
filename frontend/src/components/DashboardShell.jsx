import { useCallback, useEffect, useState, Suspense } from 'react'
import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SearchIcon from '@mui/icons-material/Search'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import geminiLogo from '../../images/gemini-svg.svg'
import { apiGet } from '../api/client.js'
import { useSpectraSocket } from '../hooks/useSpectraSocket.js'
import AuthDialog from './LoginDialog.jsx'
import { getAuthToken, clearAuth } from '../userSession.js'
import { ConsolePanel } from './ConsolePanel.jsx'
import { ClusterOverview } from './ClusterOverview.jsx'
import { DataExplorer } from './DataExplorer.jsx'
import { IngestionPanel } from './IngestionPanel.jsx'
import { SearchView } from './SearchView.jsx'
import { DocumentList } from './DocumentList.jsx'
import { JobToast } from './JobToast.jsx'
import { CollectionsView } from './CollectionsView.jsx'

export function DashboardShell({ mode, onToggleMode }) {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [chunks, setChunks] = useState([])
  const [documents, setDocuments] = useState([])
  const [collections, setCollections] = useState([])
  const [toast, setToast] = useState(null)
  const { socket, status, events } = useSpectraSocket()
  const authToken = getAuthToken()

  const loadData = useCallback(async () => {
    const [nextStats, nextChunks, nextDocuments, nextCollections] = await Promise.all([
      apiGet('/api/indexes/stats'),
      apiGet('/api/indexes/chunks?limit=1000'),
      apiGet('/api/indexes/documents'),
      apiGet('/api/collections')
    ])
    setStats(nextStats)
    setChunks(nextChunks)
    setDocuments(nextDocuments)
    setCollections(nextCollections)
  }, [])

  useEffect(() => {
    loadData().catch(() => {})
  }, [loadData])

  useEffect(() => {
    const refreshData = () => {
      loadData().catch(() => {})
    }

    socket.on('documentDeleted', refreshData)
    socket.on('ingestion:completed', refreshData)

    return () => {
      socket.off('documentDeleted', refreshData)
      socket.off('ingestion:completed', refreshData)
    }
  }, [socket, loadData])

  useEffect(() => {
    const handleIngestionComplete = event => {
      setToast({
        severity: 'success',
        message: `Ingestion complete: ${event.chunkCount ?? event.chunks?.length ?? 0} chunks indexed`
      })
    }
    const handleIngestionError = event => {
      setToast({
        severity: 'error',
        message: event?.message || 'Ingestion failed'
      })
    }
    const handleRebuildComplete = event => {
      setToast({
        severity: 'success',
        message: event?.message || 'Vector rebuild complete'
      })
    }
    const handleRebuildError = event => {
      setToast({
        severity: 'error',
        message: event?.message || 'Vector rebuild failed'
      })
    }

    socket.on('ingestion:completed', handleIngestionComplete)
    socket.on('ingestion:error', handleIngestionError)
    socket.on('index:rebuild:completed', handleRebuildComplete)
    socket.on('index:rebuild:error', handleRebuildError)

    return () => {
      socket.off('ingestion:completed', handleIngestionComplete)
      socket.off('ingestion:error', handleIngestionError)
      socket.off('index:rebuild:completed', handleRebuildComplete)
      socket.off('index:rebuild:error', handleRebuildError)
    }
  }, [socket])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Toolbar
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          gap: 2,
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: theme => theme.zIndex.appBar
        }}
      >
        <Box
          component="img"
          src={geminiLogo}
          alt="Spectra"
          sx={{ width: 34, height: 34, borderRadius: 1 }}
        />
        <Typography variant="h6" sx={{ flex: 1 }}>
          Spectra
        </Typography>
        <Chip
          size="small"
          label={status}
          color={status === 'connected' ? 'success' : 'default'}
        />
        {authToken ? (
          <Button onClick={() => {
            clearAuth()
            location.reload()
          }} variant="outlined">Logout</Button>
        ) : (
          <>
            <Button onClick={() => {
              setAuthMode('login')
              setAuthOpen(true)
            }} variant="outlined">
              Sign in
            </Button>
            <Button onClick={() => {
              setAuthMode('register')
              setAuthOpen(true)
            }} variant="contained">
              Sign up
            </Button>
          </>
        )}
        <Tooltip title="Theme">
          <IconButton onClick={onToggleMode} color="inherit">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
      </Toolbar>

      <Container component="main" id="main-content" maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontSize: { xs: 28, md: 34 } }}>Vector control room</Typography>
              <Typography color="text.secondary">
                pgvector index, metadata, sockets
              </Typography>
            </Box>
            <Button startIcon={<UploadFileIcon />} variant="contained" onClick={() => setTab('ingest')} aria-label="Open ingestion panel">
              Ingest
            </Button>
            <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setTab('search')} aria-label="Open search panel">
              Query
            </Button>
          </Stack>

          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              px: 1
            }}
          >
            <Tabs
              value={tab}
              onChange={(event, value) => setTab(value)}
              aria-label="Main navigation tabs"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              <Tab value="overview" label="Overview" />
              <Tab value="ingest" label="Ingest" />
              <Tab value="documents" label="Documents" />
              <Tab value="collections" label="Collections" />
              <Tab value="explorer" label="Explorer" />
              <Tab value="search" label="Search" />
              <Tab value="console" label="Console" />
            </Tabs>
          </Box>

          <Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>}>
            <Box hidden={tab !== 'overview'}>
              {stats &&
                <ClusterOverview
                  stats={stats}
                  socket={socket}
                  onRebuilt={loadData}
                />
              }
            </Box>
            <Box hidden={tab !== 'ingest'}>
              <IngestionPanel socket={socket} canIngest={Boolean(authToken)} onCompleted={loadData} />
            </Box>
            <Box hidden={tab !== 'documents'}>
              <DocumentList documents={documents} onDocumentRemoved={loadData} />
            </Box>
            <Box hidden={tab !== 'collections'}>
              <CollectionsView documents={documents} collections={collections} onChanged={loadData} />
            </Box>
            <Box hidden={tab !== 'explorer'}>
              <DataExplorer chunks={chunks} />
            </Box>
            <Box hidden={tab !== 'search'}>
              <SearchView socket={socket} collections={collections} />
            </Box>
            <Box hidden={tab !== 'console'}>
              <ConsolePanel events={events} />
            </Box>
          </Suspense>
        </Stack>
      </Container>
      <AuthDialog
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
      />
      <JobToast toast={toast} onClose={() => setToast(null)} />
    </Box>
  )
}
