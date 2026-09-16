import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './styles/tokens.css'
import './index.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 브라우저 주소를 기준으로 화면을 전환합니다. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)