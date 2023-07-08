import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // Disable React.StrictMode to avoid double render
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)
