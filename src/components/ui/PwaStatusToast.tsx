import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from './icons';
import { useState, useEffect } from 'react';
import { DURATION, EASE_OUT_EXPO, EASE_IN_OUT } from '../../utils/motion';
import { consumeUpdatedReason, type UpdateReason } from '../../utils/appUpdate';

const NOTE_DURATION_MS = 3000;

export default function PwaStatusToast() {
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const [showBackOnline, setShowBackOnline] = useState(false);
    // Set when the previous page load reloaded itself to apply an update (see utils/appUpdate.ts)
    const [updatedReason, setUpdatedReason] = useState<UpdateReason | null>(consumeUpdatedReason);

    useEffect(() => {
        if (!updatedReason) return;
        const timer = setTimeout(() => setUpdatedReason(null), NOTE_DURATION_MS);
        return () => clearTimeout(timer);
    }, [updatedReason]);

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
            }, NOTE_DURATION_MS);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const isVisible = isOffline || showBackOnline || updatedReason !== null;

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
                    ) : showBackOnline ? (
                        <>
                            <Wifi size={16} className="pwa-status-toast__icon pwa-status-toast__icon--online" />
                            <span>Back online</span>
                        </>
                    ) : (
                        <span>{updatedReason === 'data' ? 'Updated with new photos' : 'Site updated'}</span>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
