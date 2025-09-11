import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/tema.css'
import './styles/login.css'
import './styles/auth.css'
import "./styles/chatbot.css";
import "./styles/catalogo.css";
import './styles/CarruselOfertas.css';
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { HelmetProvider } from 'react-helmet-async'

ReactDOM.createRoot(document.getElementById('root')).render(
   <React.StrictMode>
    <BrowserRouter>
     <HelmetProvider>
       <ErrorBoundary>
         <App />
       </ErrorBoundary>
     </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(console.error);
  });
}

