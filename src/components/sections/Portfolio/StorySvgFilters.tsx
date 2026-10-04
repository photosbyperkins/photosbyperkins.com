import React from 'react';

export interface StorySvgFiltersProps {
    filterStrength?: number;
}

/**
 * Global SVG filter definitions for live selective color, cinematic, neon, and duotone filters.
 * Mounted within StoryExportModal to provide instant hardware-accelerated preview in croppers
 * and thumbnail swatches in StoryFiltersTab.
 */
export const StorySvgFilters: React.FC<StorySvgFiltersProps> = ({ filterStrength = 1.0 }) => {
    const bgSaturate = Math.max(0, Math.min(1, 1 - filterStrength));
    const s = Math.max(0.1, Math.min(1.0, filterStrength));

    return (
        <svg
            style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none', overflow: 'hidden' }}
            aria-hidden="true"
        >
            <defs>
                {/* 1. Selective Red (Live Dynamic Preview) */}
                <filter id="story-filter-selective-red" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values={String(bgSaturate)} in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="redDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                4.8 -3.4 -2.4 0 -0.45"
                    />
                    <feComponentTransfer in="redDiff" result="redMask">
                        <feFuncA type="linear" slope="3.5" intercept="-0.35" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="redMask" operator="in" result="redOnly" />
                    <feComposite in="redOnly" in2="bg" operator="over" />
                </filter>

                {/* 1b. Selective Red Swatch (Static Full Strength 1.0) */}
                <filter id="story-filter-selective-red-swatch" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values="0" in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="redDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                4.8 -3.4 -2.4 0 -0.45"
                    />
                    <feComponentTransfer in="redDiff" result="redMask">
                        <feFuncA type="linear" slope="3.5" intercept="-0.35" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="redMask" operator="in" result="redOnly" />
                    <feComposite in="redOnly" in2="bg" operator="over" />
                </filter>

                {/* 2. Selective Green (Live Dynamic Preview) */}
                <filter id="story-filter-selective-green" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values={String(bgSaturate)} in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="greenDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                -2 3.2 -2 0 -0.15"
                    />
                    <feComponentTransfer in="greenDiff" result="greenMask">
                        <feFuncA type="linear" slope="3" intercept="-0.1" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="greenMask" operator="in" result="greenOnly" />
                    <feComposite in="greenOnly" in2="bg" operator="over" />
                </filter>

                {/* 2b. Selective Green Swatch (Static Full Strength 1.0) */}
                <filter id="story-filter-selective-green-swatch" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values="0" in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="greenDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                -2 3.2 -2 0 -0.15"
                    />
                    <feComponentTransfer in="greenDiff" result="greenMask">
                        <feFuncA type="linear" slope="3" intercept="-0.1" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="greenMask" operator="in" result="greenOnly" />
                    <feComposite in="greenOnly" in2="bg" operator="over" />
                </filter>

                {/* 3. Selective Blue (Live Dynamic Preview) */}
                <filter id="story-filter-selective-blue" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values={String(bgSaturate)} in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="blueDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                -2 -2 3.2 0 -0.15"
                    />
                    <feComponentTransfer in="blueDiff" result="blueMask">
                        <feFuncA type="linear" slope="3" intercept="-0.1" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="blueMask" operator="in" result="blueOnly" />
                    <feComposite in="blueOnly" in2="bg" operator="over" />
                </filter>

                {/* 3b. Selective Blue Swatch (Static Full Strength 1.0) */}
                <filter id="story-filter-selective-blue-swatch" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values="0" in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="blueDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                -2 -2 3.2 0 -0.15"
                    />
                    <feComponentTransfer in="blueDiff" result="blueMask">
                        <feFuncA type="linear" slope="3" intercept="-0.1" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="blueMask" operator="in" result="blueOnly" />
                    <feComposite in="blueOnly" in2="bg" operator="over" />
                </filter>

                {/* 4. Selective Yellow (Live Dynamic Preview) */}
                <filter id="story-filter-selective-yellow" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values={String(bgSaturate)} in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="yellowDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                2.5 2.5 -4.5 0 -0.45"
                    />
                    <feComponentTransfer in="yellowDiff" result="yellowMask">
                        <feFuncA type="linear" slope="3.5" intercept="-0.35" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="yellowMask" operator="in" result="yellowOnly" />
                    <feComposite in="yellowOnly" in2="bg" operator="over" />
                </filter>

                {/* 4b. Selective Yellow Swatch (Static Full Strength 1.0) */}
                <filter id="story-filter-selective-yellow-swatch" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values="0" in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="yellowDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                2.5 2.5 -4.5 0 -0.45"
                    />
                    <feComponentTransfer in="yellowDiff" result="yellowMask">
                        <feFuncA type="linear" slope="3.5" intercept="-0.35" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="yellowMask" operator="in" result="yellowOnly" />
                    <feComposite in="yellowOnly" in2="bg" operator="over" />
                </filter>

                {/* 5. Selective Purple (Live Dynamic Preview) */}
                <filter id="story-filter-selective-purple" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values={String(bgSaturate)} in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="purpleDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                2.6 -4.2 2.6 0 -0.25"
                    />
                    <feComponentTransfer in="purpleDiff" result="purpleMask">
                        <feFuncA type="linear" slope="3.5" intercept="-0.25" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="purpleMask" operator="in" result="purpleOnly" />
                    <feComposite in="purpleOnly" in2="bg" operator="over" />
                </filter>

                {/* 5b. Selective Purple Swatch (Static Full Strength 1.0) */}
                <filter id="story-filter-selective-purple-swatch" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values="0" in="SourceGraphic" result="bg" />
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="purpleDiff"
                        values="0 0 0 0 0
                                0 0 0 0 0
                                0 0 0 0 0
                                2.6 -4.2 2.6 0 -0.25"
                    />
                    <feComponentTransfer in="purpleDiff" result="purpleMask">
                        <feFuncA type="linear" slope="3.5" intercept="-0.25" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="purpleMask" operator="in" result="purpleOnly" />
                    <feComposite in="purpleOnly" in2="bg" operator="over" />
                </filter>

                {/* 6. Cinematic (Hollywood Teal & Orange Split-Tone) */}
                <filter id="story-filter-cinematic" colorInterpolationFilters="sRGB">
                    <feColorMatrix
                        type="matrix"
                        values={`${1 + 0.25 * s} 0 0 0 ${-0.05 * s}
                                0 ${1 + 0.08 * s} 0 0 ${0.02 * s}
                                0 0 ${1 + 0.3 * s} 0 ${0.08 * s}
                                0 0 0 1 0`}
                    />
                    <feComponentTransfer>
                        <feFuncR type="linear" slope={String(1 + 0.2 * s)} intercept={String(-0.08 * s)} />
                        <feFuncG type="linear" slope="1" intercept="0" />
                        <feFuncB type="linear" slope={String(1 - 0.15 * s)} intercept={String(0.12 * s)} />
                    </feComponentTransfer>
                </filter>

                {/* 6b. Cinematic Swatch (Static Full Strength 1.0) */}
                <filter id="story-filter-cinematic-swatch" colorInterpolationFilters="sRGB">
                    <feColorMatrix
                        type="matrix"
                        values="1.25 0 0 0 -0.05
                                0 1.08 0 0 0.02
                                0 0 1.3 0 0.08
                                0 0 0 1 0"
                    />
                    <feComponentTransfer>
                        <feFuncR type="linear" slope="1.2" intercept="-0.08" />
                        <feFuncG type="linear" slope="1" intercept="0" />
                        <feFuncB type="linear" slope="0.85" intercept="0.12" />
                    </feComponentTransfer>
                </filter>

                {/* 7. Neon (Cyberpunk Magenta & Cyan Drift) */}
                <filter id="story-filter-neon" colorInterpolationFilters="sRGB">
                    <feColorMatrix
                        type="matrix"
                        values={`${1 + 0.3 * s} 0 ${0.1 * s} 0 ${0.1 * s}
                                0 ${1 - 0.15 * s} 0 0 ${-0.05 * s}
                                ${0.1 * s} 0 ${1 + 0.4 * s} 0 ${0.15 * s}
                                0 0 0 1 0`}
                    />
                    <feComponentTransfer>
                        <feFuncR type="linear" slope={String(1 + 0.25 * s)} intercept={String(0.05 * s)} />
                        <feFuncG type="linear" slope={String(1 - 0.15 * s)} intercept={String(-0.02 * s)} />
                        <feFuncB type="linear" slope={String(1 + 0.3 * s)} intercept={String(0.08 * s)} />
                    </feComponentTransfer>
                </filter>

                {/* 7b. Neon Swatch (Static Full Strength 1.0) */}
                <filter id="story-filter-neon-swatch" colorInterpolationFilters="sRGB">
                    <feColorMatrix
                        type="matrix"
                        values="1.3 0 0.1 0 0.1
                                0 0.85 0 0 -0.05
                                0.1 0 1.4 0 0.15
                                0 0 0 1 0"
                    />
                    <feComponentTransfer>
                        <feFuncR type="linear" slope="1.25" intercept="0.05" />
                        <feFuncG type="linear" slope="0.85" intercept="-0.02" />
                        <feFuncB type="linear" slope="1.3" intercept="0.08" />
                    </feComponentTransfer>
                </filter>

                {/* 8. Duotone (Navy Shadows & Crimson Highlights) */}
                <filter id="story-filter-duotone" colorInterpolationFilters="sRGB">
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="gray"
                        values="0.2126 0.7152 0.0722 0 0
                                0.2126 0.7152 0.0722 0 0
                                0.2126 0.7152 0.0722 0 0
                                0 0 0 1 0"
                    />
                    <feComponentTransfer in="gray">
                        <feFuncR type="linear" slope={String(0.9 * s)} intercept={String(0.06 * s)} />
                        <feFuncG type="linear" slope={String(0.1 * s)} intercept={String(0.08 * s)} />
                        <feFuncB type="linear" slope={String(-0.05 * s)} intercept={String(0.22 * s)} />
                    </feComponentTransfer>
                </filter>

                {/* 8b. Duotone Swatch (Static Full Strength 1.0) */}
                <filter id="story-filter-duotone-swatch" colorInterpolationFilters="sRGB">
                    <feColorMatrix
                        type="matrix"
                        in="SourceGraphic"
                        result="gray"
                        values="0.2126 0.7152 0.0722 0 0
                                0.2126 0.7152 0.0722 0 0
                                0.2126 0.7152 0.0722 0 0
                                0 0 0 1 0"
                    />
                    <feComponentTransfer in="gray">
                        <feFuncR type="linear" slope="0.9" intercept="0.06" />
                        <feFuncG type="linear" slope="0.1" intercept="0.08" />
                        <feFuncB type="linear" slope="-0.05" intercept="0.22" />
                    </feComponentTransfer>
                </filter>
            </defs>
        </svg>
    );
};
