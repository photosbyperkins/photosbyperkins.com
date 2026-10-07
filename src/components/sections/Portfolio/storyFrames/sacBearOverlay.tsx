import { useState, useEffect } from 'react';
import type { BearPathDef } from './types';
import { loadSacBearPaths } from './sacBearLoader';

export interface SacBearGraphicProps {
    transform: string;
    primary: string;
    accent: string;
    highlight: string;
}

export function SacBearGraphic({ transform, primary, accent, highlight }: SacBearGraphicProps) {
    const [paths, setPaths] = useState<BearPathDef[] | null>(null);

    useEffect(() => {
        let active = true;
        loadSacBearPaths().then((loaded) => {
            if (active) setPaths(loaded);
        });
        return () => {
            active = false;
        };
    }, []);

    if (!paths) return null;

    return (
        <g transform={transform}>
            {paths.map((p, idx) => (
                <path
                    key={idx}
                    d={p.d}
                    fill={p.type === 'accent' ? accent : p.type === 'highlight' ? highlight : primary}
                />
            ))}
        </g>
    );
}
