import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import { App } from './App'
import { Backdrop } from './components/Backdrop'
import { requestPersistentStorage } from './lib/storage'

void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Backdrop />
    <App />
  </StrictMode>,
)
