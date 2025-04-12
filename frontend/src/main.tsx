import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { AuthProvider } from './contexts/AuthContext'
import theme from './theme'
import './index.css'
import App from './App'

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </StrictMode>
)
