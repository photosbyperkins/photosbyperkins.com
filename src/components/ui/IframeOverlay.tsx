import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import ModalShell from './ModalShell';
import '../../styles/_iframe-overlay.scss';

export default function IframeOverlay() {
    const iframeUrl = useAppStore((state) => state.iframeUrl);
    const iframeTitle = useAppStore((state) => state.iframeTitle);
    const iframeExternalUrl = useAppStore((state) => state.iframeExternalUrl);
    const closeIframe = useAppStore((state) => state.closeIframe);
    const [prevUrl, setPrevUrl] = useState(iframeUrl);
    const [isLoading, setIsLoading] = useState(true);

    if (iframeUrl !== prevUrl) {
        setPrevUrl(iframeUrl);
        setIsLoading(true);
    }

    return (
        <ModalShell
            isOpen={Boolean(iframeUrl)}
            onClose={closeIframe}
            title={iframeTitle || 'WFTDA STATS'}
            ariaLabel={iframeTitle || 'External Link Overlay'}
            className="iframe-overlay"
            contentClassName="iframe-overlay__body"
            maxWidth="full"
            externalUrl={iframeExternalUrl || iframeUrl || undefined}
            externalTitle="Open in new tab"
        >
            <div className="iframe-overlay__content">
                {isLoading && <div className="iframe-overlay__loading">Loading...</div>}
                {iframeUrl && (
                    <iframe
                        src={iframeUrl}
                        className={`iframe-overlay__iframe ${isLoading ? 'iframe-overlay__iframe--loading' : ''}`}
                        onLoad={() => setIsLoading(false)}
                        title={iframeTitle || 'External content'}
                    />
                )}
            </div>
        </ModalShell>
    );
}
