import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ProfileProvider } from './context/ProfileContext'
import PasswordGate from './components/PasswordGate'
import './index.css'
import App from './App.tsx'
import { migrateMineralSerumValues } from './utils/bloodwork-utils'

// Einmalige Daten-Reparatur VOR dem ersten Render: fehlplatzierte Serum-Werte
// (Magnesium/Zink/Selen) von der Vollblut-ID auf die Serum-ID umtragen.
migrateMineralSerumValues()

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
