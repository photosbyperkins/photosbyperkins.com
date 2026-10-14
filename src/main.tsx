import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MotionConfig } from 'framer-motion';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { initRum } from './utils/rum';
import './index.scss';
import '@fontsource/barlow-condensed/latin-400.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/outfit/latin-400.css';

initRum();

// Force a hard reload if Vite fails to load a dynamic chunk or asset
// This usually happens when the app updates but the user has an old index.html cached
window.addEventListener('vite:preloadError', (event) => {
    if (import.meta.env.DEV || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        event.preventDefault();
        return;
    }
    window.location.reload();
});

let refreshing = false;
if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
    const hasExistingController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Do not reload on first install / claim; only reload on update of existing SW
        const wasPreviouslyControlled = hasExistingController || sessionStorage.getItem('sw-initialized') === 'true';
        if (!wasPreviouslyControlled) {
            sessionStorage.setItem('sw-initialized', 'true');
            return;
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return;
        }
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

registerSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, registration) {
        if (!registration) return;
        // Check for service worker updates whenever the user returns to the tab or app on mobile
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                registration.update().catch(() => {});
            }
        });
        // Check periodically every 15 minutes while app is open
        setInterval(
            () => {
                registration.update().catch(() => {});
            },
            15 * 60 * 1000
        );
    },
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <MotionConfig reducedMotion="user">
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </MotionConfig>
    </StrictMode>
);
