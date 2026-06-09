import { useMemo, useState } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { createSpectraTheme } from './theme.js'
import { DashboardShell } from './components/DashboardShell.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

export default function App() {
  const [mode, setMode] = useState('dark')
  const theme = useMemo(() => createSpectraTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <DashboardShell
          mode={mode}
          onToggleMode={() => setMode(current => current === 'dark' ? 'light' : 'dark')}
        />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
