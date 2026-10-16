import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from './icons';
import { useState, useEffect, useRef } from 'react';
import { DURATION, EASE_OUT_EXPO, EASE_IN_OUT } from '../../utils/motion';
import { getBuildNumber } from '../../utils/build';

interface PwaStatusToastProps {
    currentBuildNumber?: string;
}

export default function PwaStatusToast({ currentBuildNumber }: PwaStatusToastProps = {}) {
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const [showBackOnline, setShowBackOnline] = useState(false);
    const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);
    const baselineBuildRef = useRef<string>(currentBuildNumber ?? getBuildNumber());

    useEffect(() => {
        if (currentBuildNumber !== undefined) {
            baselineBuildRef.current = currentBuildNumber;
        }
    }, [currentBuildNumber]);

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

        const handleUpdateAvailable = () => {
            setHasUpdateAvailable(true);
        };

        const checkRemoteBuildNumber = async () => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;
            if (typeof fetch !== 'function') return;
            try {
                const res = await fetch(`/data/index.json?t=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) return;
                const data = (await res.json()) as { buildNumber?: string | number };
                const remoteBuild = data?.buildNumber != null ? String(data.buildNumber).trim() : '';
                if (!remoteBuild) return;
                if (!baselineBuildRef.current) {
                    baselineBuildRef.current = remoteBuild;
                    return;
                }
                if (remoteBuild !== baselineBuildRef.current) {
                    setHasUpdateAvailable(true);
                }
            } catch {
                // Ignore transient fetch errors during background visibility check
            }
        };

        const handleVisibilityChange = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                void checkRemoteBuildNumber();
            }
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        window.addEventListener('pwa:update-available', handleUpdateAvailable);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('pwa:update-available', handleUpdateAvailable);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const isVisible = isOffline || showBackOnline || hasUpdateAvailable;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={`pwa-status-toast${hasUpdateAvailable && !isOffline ? ' pwa-status-toast--interactive' : ''}`}
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
                    ) : hasUpdateAvailable ? (
                        <>
                            <span>New photos available</span>
                            <button
                                type="button"
                                className="pwa-status-toast__action"
                                onClick={() => window.location.reload()}
                            >
                                Refresh
                            </button>
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

