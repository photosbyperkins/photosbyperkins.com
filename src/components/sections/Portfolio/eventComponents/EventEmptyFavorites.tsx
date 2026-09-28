import React from 'react';
import { Heart } from 'lucide-react';

export function EventEmptyFavorites() {
    return (
        <div
            className="portfolio__empty-state"
            style={{ padding: '3rem 1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}
        >
            <Heart size={48} strokeWidth={1} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p
                style={{
                    margin: 0,
                    fontFamily: 'var(--font-condensed)',
                    fontSize: '1.2rem',
                    letterSpacing: '0.05em',
                }}
            >
                NO FAVORITES YET
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Click the heart icon on any photo to add it here.
            </p>
        </div>
    );
}

export default EventEmptyFavorites;
