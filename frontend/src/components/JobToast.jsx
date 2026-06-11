import { Alert, Snackbar } from '@mui/material'

export function JobToast({ toast, onClose }) {
  return (
    <Snackbar open={Boolean(toast)} autoHideDuration={5000} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      {toast ? (
        <Alert severity={toast.severity} variant="filled" onClose={onClose}>
          {toast.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  )
}
