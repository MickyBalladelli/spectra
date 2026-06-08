import { createTheme } from '@mui/material/styles'

export function createSpectraTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#48b7ff'
      },
      secondary: {
        main: '#ffb84d'
      },
      success: {
        main: '#55d68d'
      },
      background: {
        default: mode === 'dark' ? '#101317' : '#f5f7fb',
        paper: mode === 'dark' ? '#171b22' : '#ffffff'
      }
    },
    shape: {
      borderRadius: 8
    },
    typography: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h4: {
        fontWeight: 700
      },
      h6: {
        fontWeight: 700
      },
      button: {
        textTransform: 'none',
        fontWeight: 700
      }
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      }
    }
  })
}
