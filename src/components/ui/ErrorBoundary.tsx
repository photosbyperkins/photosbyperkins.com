import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { recordRumError } from '../../utils/rum';

export interface ErrorBoundaryProps {
    name: string;
    variant?: 'section' | 'overlay';
    resetKeys?: ReadonlyArray<unknown>;
    onReset?: () => void;
    onDismiss?: () => void;
    fallbackTitle?: string;
    fallbackMessage?: string;
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

function areResetKeysEqual(
    prevKeys?: ReadonlyArray<unknown>,
    nextKeys?: ReadonlyArray<unknown>
): boolean {
    if (prevKeys === nextKeys) return true;
    if (!prevKeys || !nextKeys || prevKeys.length !== nextKeys.length) return false;
    for (let i = 0; i < prevKeys.length; i++) {
        if (!Object.is(prevKeys[i], nextKeys[i])) return false;
    }
    return true;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    override state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error(`[ErrorBoundary:${this.props.name}]`, error, errorInfo);
        recordRumError(this.props.name, error, errorInfo.componentStack || undefined);
    }

    override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
        if (this.state.hasError && !areResetKeysEqual(prevProps.resetKeys, this.props.resetKeys)) {
            this.setState({ hasError: false, error: null });
        }
    }

    private handleTryAgain = (): void => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    private handleDismiss = (): void => {
        this.setState({ hasError: false, error: null });
        this.props.onDismiss?.();
    };

    private handleReloadPage = (): void => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    override render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const isOverlay = this.props.variant === 'overlay';
        const title = this.props.fallbackTitle || 'Something went wrong in this view';
        const message =
            this.props.fallbackMessage ||
            'An unexpected error occurred while rendering. You can try reloading this view without losing your place.';

        const cardStyle: React.CSSProperties = {
            maxWidth: '28rem',
            width: '100%',
            margin: isOverlay ? '1rem' : '3rem auto',
            padding: '1.75rem 1.5rem',
            borderRadius: '12px',
            background: 'var(--bg-secondary, #18181b)',
            color: 'var(--text-primary, #f4f4f5)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
            textAlign: 'center',
        };

        const primaryButtonStyle: React.CSSProperties = {
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--color-accent, #e60000)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
        };

        const secondaryButtonStyle: React.CSSProperties = {
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.2))',
            background: 'transparent',
            color: 'var(--text-primary, #f4f4f5)',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
        };

        const card = (
            <div
                className={`error-boundary error-boundary--${this.props.variant || 'section'}`}
                data-boundary={this.props.name}
                role="alert"
                aria-live="assertive"
                style={cardStyle}
            >
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h2>
                <p
                    style={{
                        fontSize: '0.92rem',
                        color: 'var(--text-secondary, #a1a1aa)',
                        lineHeight: 1.5,
                        marginBottom: '1.25rem',
                    }}
                >
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" onClick={this.handleTryAgain} style={primaryButtonStyle}>
                        Reload view
                    </button>
                    {isOverlay && this.props.onDismiss ? (
                        <button type="button" onClick={this.handleDismiss} style={secondaryButtonStyle}>
                            Close
                        </button>
                    ) : (
                        <button type="button" onClick={this.handleReloadPage} style={secondaryButtonStyle}>
                            Reload page
                        </button>
                    )}
                </div>
            </div>
        );

        if (isOverlay) {
            return (
                <div
                    className="error-boundary__backdrop"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.72)',
                        backdropFilter: 'blur(6px)',
                    }}
                >
                    {card}
                </div>
            );
        }

        return card;
    }
}
