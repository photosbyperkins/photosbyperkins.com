import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EventEmptyFavorites } from './EventEmptyFavorites';

describe('EventEmptyFavorites', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders empty favorites heading and instructional message', () => {
        render(<EventEmptyFavorites />);

        expect(screen.getByText('NO FAVORITES YET')).toBeDefined();
        expect(screen.getByText(/Click the heart icon on any photo to add it here/i)).toBeDefined();
    });
});
