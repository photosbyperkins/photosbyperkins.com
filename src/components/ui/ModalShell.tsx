import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import '../../styles/_modal-shell.scss';

export interface ModalShellProps {
    isOpen: boolean;
    onClose: () => void;
    title: string | React.ReactNode;
    ariaLabel: string;
    className?: string;
    contentClassName?: string;
    maxWidth?: 'narrow' | 'default' | 'wide' | 'full';
    externalUrl?: string;
    externalTitle?: string;
    headerActions?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    contentRef?: React.Ref<HTMLDivElement>;
    style?: React.CSSProperties;
}

export default function ModalShell({
    isOpen,
    onClose,
    title,
    ariaLabel,
    className = '',
    contentClassName = '',
    maxWidth = 'default',
    externalUrl,
    externalTitle = 'Open external link',
    headerActions,
    footer,
    children,
    contentRef,
    style,
}: ModalShellProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    useBodyScrollLock(isOpen);
    useFocusTrap(modalRef, isOpen, closeBtnRef);

    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, onClose]);

    const containerMaxWidthClass = `modal-shell__container--${maxWidth}`;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={modalRef}
                    className={`modal-shell modal-shell--${maxWidth} ${className}`}
                    role="dialog"
                    aria-modal="true"
                    aria-label={ariaLabel}
                    tabIndex={-1}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    style={style}
                >
                    <header className="modal-shell__header-bar">
                        <div className="container modal-shell__header-bar-inner">
                            {typeof title === 'string' ? (
                                <h2 className="section-label modal-shell__title">{title}</h2>
                            ) : (
                                <div className="section-label modal-shell__title">{title}</div>
                            )}

                            <div className="modal-shell__actions">
                                {externalUrl && (
                                    <a
                                        href={externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="modal-shell__action-btn"
                                        aria-label={externalTitle}
                                        title={externalTitle}
                                    >
                                        <ExternalLink size={20} />
                                    </a>
                                )}
                                {headerActions}
                                <button
                                    ref={closeBtnRef}
                                    type="button"
                                    className="modal-shell__action-btn modal-shell__close-btn"
                                    onClick={onClose}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </header>

                    <div
                        ref={contentRef}
                        className={`modal-shell__content ${contentClassName}`}
                        tabIndex={0}
                        role="region"
                        aria-label={typeof title === 'string' ? `${title} content` : ariaLabel}
                    >
                        <div className={`container modal-shell__container ${containerMaxWidthClass}`}>{children}</div>
                    </div>

                    {footer && (
                        <footer className="modal-shell__footer-bar">
                            <div className="container modal-shell__footer-bar-inner">{footer}</div>
                        </footer>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
