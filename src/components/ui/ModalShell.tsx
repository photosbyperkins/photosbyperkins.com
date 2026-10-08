import { motion, AnimatePresence } from 'framer-motion';
import { DURATION, EASE_IN_OUT, EASE_OUT_EXPO } from '../../utils/motion';
import { X, ExternalLink } from './icons';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
    const [isLocked, setIsLocked] = useState(isOpen);

    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setIsLocked(true);
        }
    }

    const handleExitComplete = () => {
        setIsLocked(false);
    };

    useBodyScrollLock(isLocked);
    useFocusTrap(modalRef, isLocked, closeBtnRef);

    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
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

    const content = (
        <AnimatePresence onExitComplete={handleExitComplete}>
            {isOpen && (
                <motion.div
                    ref={modalRef}
                    className={`modal-shell modal-shell--${maxWidth} ${className}`}
                    role="dialog"
                    aria-modal="true"
                    aria-label={ariaLabel}
                    tabIndex={-1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2, ease: EASE_IN_OUT } }}
                    transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
                    style={style}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
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
                        <motion.div
                            className={`container modal-shell__container ${containerMaxWidthClass}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: DURATION.modal, delay: 0.05, ease: EASE_OUT_EXPO }}
                        >
                            {children}
                        </motion.div>
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

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
}
