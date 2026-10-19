import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import App from './App'
import './index.css'

// Web fonts load lazily — only when text first needs a face. Lower sections use faces the hero
// doesn't (italic display, Inter 600), so they used to arrive mid-scroll and each one forced a
// relayout of every text node. Request every face we use right after load (when idle), so the
// swaps happen before the visitor scrolls — without delaying first paint or the load event.
if (typeof window !== 'undefined' && 'fonts' in document) {
  const preloadFonts = () => {
    for (const f of ['400 1em "Cormorant Garamond"', '500 1em "Cormorant Garamond"', 'italic 400 1em "Cormorant Garamond"', '400 1em Inter', '500 1em Inter', '600 1em Inter']) document.fonts.load(f).catch(() => {})
  }
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
  const schedule = () => (idle ? idle(preloadFonts, { timeout: 1500 }) : setTimeout(preloadFonts, 200))
  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>,
)
