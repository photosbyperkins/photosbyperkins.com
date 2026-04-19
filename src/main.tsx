import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/outfit/400.css';

import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';

import './index.scss';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';

// Force a hard reload if Vite fails to load a dynamic chunk or asset
// This usually happens when the app updates but the user has an old index.html cached
window.addEventListener('vite:preloadError', () => {
    window.location.reload();
});

let refreshing = false;
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <HelmetProvider>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </HelmetProvider>
    </StrictMode>
);
