// Browser entry point: mount React once and let the router choose the page from the URL.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app/styles.js';
import App from './app/App.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Register } from './modules/identity/index.js';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/*" element={<App />} />
                <Route path="/identity/new/" element={<Register />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>,
);
