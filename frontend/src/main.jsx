import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppContextProvider from './context/AppContext.jsx';
import axios from 'axios'
import { setupCsrfInterceptor } from './utils/csrfToken.js'

axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true'
setupCsrfInterceptor(axios)

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
  <AppContextProvider>
    <App />
  </AppContextProvider>
  </BrowserRouter>,
)
