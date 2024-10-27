import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.tsx'
import SunSchedule from './SunSchedule.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SunSchedule />
  </StrictMode>,
)
