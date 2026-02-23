import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ProfileProvider } from './context/ProfileContext'
import PasswordGate from './components/PasswordGate'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <BrowserRouter basename="/blutwerte-tool">
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </BrowserRouter>
    </PasswordGate>
  </StrictMode>,
)
