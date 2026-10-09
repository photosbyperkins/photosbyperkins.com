import React from 'react';

interface StoryOptionsRowProps {
    /** Left-aligned controls (e.g. Tint, strength slider). */
    start?: React.ReactNode;
    /** Right-aligned controls (e.g. Animate toggle). */
    end?: React.ReactNode;
}

/** Compact single row of per-selection options shown between the chips and the thumbnail browser. */
export const StoryOptionsRow: React.FC<StoryOptionsRowProps> = ({ start, end }) => (
    <div className="story-options-row">
        <div className="story-options-row__start">{start}</div>
        {end && <div className="story-options-row__end">{end}</div>}
    </div>
);

export default StoryOptionsRow;
