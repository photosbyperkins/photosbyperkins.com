import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from './icons';
import { useState, useEffect } from 'react';
import { DURATION, EASE_OUT_EXPO, EASE_IN_OUT } from '../../utils/motion';

export default function PwaStatusToast() {
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const [showBackOnline, setShowBackOnline] = useState(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        const handleOffline = () => {
            if (timer) clearTimeout(timer);
            setIsOffline(true);
            setShowBackOnline(false);
        };

        const handleOnline = () => {
            if (timer) clearTimeout(timer);
            setIsOffline(false);
            setShowBackOnline(true);
            timer = setTimeout(() => {
                setShowBackOnline(false);
            }, 3000);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            if (timer) clearTimeout(timer);
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
                    initial={{ opacity: 0, x: '-50%', y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: '-50%', y: 8, transition: { duration: DURATION.fast, ease: EASE_IN_OUT } }}
                    transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
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
