import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PwaStatusToast() {
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const [showBackOnline, setShowBackOnline] = useState(false);

    useEffect(() => {
        const handleOffline = () => {
            setIsOffline(true);
            setShowBackOnline(false);
        };

        const handleOnline = () => {
            setIsOffline(false);
            setShowBackOnline(true);
            const timer = setTimeout(() => {
                setShowBackOnline(false);
            }, 3000);
            return () => clearTimeout(timer);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const isVisible = isOffline || showBackOnline;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="pwa-status-toast"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    role="status"
                    aria-live="polite"
                >
                    {isOffline ? (
                        <>
                            <WifiOff size={16} className="pwa-status-toast__icon pwa-status-toast__icon--offline" />
                            <span>Offline Mode — Viewing cached photos</span>
                        </>
                    ) : (
                        <>
                            <Wifi size={16} className="pwa-status-toast__icon pwa-status-toast__icon--online" />
                            <span>Back online</span>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
