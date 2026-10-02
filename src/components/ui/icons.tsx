import React from 'react';

/**
 * Unified icon props for all custom in-house SVG icons.
 * Extends SVGProps so every icon accepts the full set of SVG attributes
 * (className, style, aria-*, onClick, id, etc.) plus convenient `size` and `strokeWidth` shorthands.
 */
export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
}

interface CreateIconOptions {
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    viewBox?: string;
    defaultSize?: number | string;
}

/**
 * Higher-order factory ensuring consistent SVG setup, default 24x24 viewBox,
 * flex-shrink prevention, stroke caps/joins, and attribute forwarding.
 */
function createIcon(paths: React.ReactNode, options: CreateIconOptions = {}) {
    const {
        fill = 'none',
        stroke = 'currentColor',
        strokeWidth = 2,
        viewBox = '0 0 24 24',
        defaultSize = 24,
    } = options;

    const IconComponent = ({
        size = defaultSize,
        strokeWidth: customStrokeWidth = strokeWidth,
        fill: customFill = fill,
        stroke: customStroke = stroke,
        className = '',
        style,
        ...props
    }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox={viewBox}
            fill={customFill}
            stroke={customStroke}
            strokeWidth={customStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            style={{ flexShrink: 0, ...style }}
            {...props}
        >
            {paths}
        </svg>
    );

    return IconComponent;
}

/* =========================================================================
   Pass 1: Geometry, Optical Centering & Alignment of Navigation & Controls
   ========================================================================= */

/**
 * Search / SearchIcon
 * Optically centered magnifying glass:
 * Circle shifted to (10.5, 10.5) with r=7 to perfectly balance the 45° handle at (21, 21).
 */
export const Search = createIcon(
    <>
        <circle cx="10.5" cy="10.5" r="7" />
        <path d="M15.5 15.5L21 21" />
    </>
);
export const SearchIcon = Search;

/**
 * X / CloseIcon / XIcon
 * Precision diagonal cross with 12px active span for balanced weight in pill buttons and modal headers.
 */
export const X = createIcon(
    <>
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
    </>
);
export const XIcon = X;
export const CloseIcon = X;

/**
 * ChevronLeft / ChevronLeftIcon
 * Arrowhead pointing left, optically centered inside circular buttons by placing apex at x=9.
 */
export const ChevronLeft = createIcon(<path d="m14.5 18-6-6 6-6" />);
export const ChevronLeftIcon = ChevronLeft;

/**
 * ChevronRight / ChevronRightIcon
 * Arrowhead pointing right, optically centered inside circular buttons by placing apex at x=15.
 */
export const ChevronRight = createIcon(<path d="m9.5 18 6-6-6-6" />);
export const ChevronRightIcon = ChevronRight;

/**
 * ExternalLink / ExternalLinkIcon
 * Refined portal box with diagonal launch arrow and crisp negative space.
 */
export const ExternalLink = createIcon(
    <>
        <path d="M15 3h6v6" />
        <path d="M10 14L21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
);
export const ExternalLinkIcon = ExternalLink;

/**
 * ArrowRight / ArrowRightIcon
 * Athletic, forward-propelling directional arrow with crisp chevron head.
 */
export const ArrowRight = createIcon(
    <>
        <path d="M4 12h16" />
        <path d="m13 5 7 7-7 7" />
    </>
);
export const ArrowRightIcon = ArrowRight;

/**
 * HelpCircle / HelpCircleIcon
 * Balanced question mark glyph resting squarely above an optically aligned dot.
 */
export const HelpCircle = createIcon(
    <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
    </>
);
export const HelpCircleIcon = HelpCircle;

/* =========================================================================
   Pass 2: Action & Micro-Feedback Icons
   ========================================================================= */

/**
 * Heart / HeartIcon
 * Continuous-curvature organic heart with flowing lobes, seamless center cleft,
 * and elegant bottom taper. Radiates warmth in both stroke and filled states.
 */
export const Heart = createIcon(
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
);
export const HeartIcon = Heart;

/**
 * Download / DownloadIcon
 * Rounded download tray with clean lead-in arrow pointing directly to the center.
 */
export const Download = createIcon(
    <>
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </>
);
export const DownloadIcon = Download;

/**
 * Save / SaveIcon
 * Modernized bulk archive save glyph:
 * Robust media container with top magnetic latch and write-protect chamfer.
 */
export const Save = createIcon(
    <>
        <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
    </>
);
export const SaveIcon = Save;

/**
 * Share2 / Share2Icon / ShareIcon
 * Airy, three-node social graph with clean inter-nodal connector lines.
 */
export const Share2 = createIcon(
    <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
);
export const Share2Icon = Share2;
export const ShareIcon = Share2;

/**
 * Check / CheckIcon
 * Golden-ratio verification checkmark with non-clipping boundary margins.
 */
export const Check = createIcon(<path d="M20 6.5L9 17.5l-5-5" />);
export const CheckIcon = Check;

/**
 * CheckSquare / CheckSquareIcon
 * Rounded selection box container with embedded checkmark badge.
 */
export const CheckSquare = createIcon(
    <>
        <path d="m9 11 3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
);
export const CheckSquareIcon = CheckSquare;

/**
 * RotateCcw / RotateCcwIcon
 * Sweeping circular counter-clockwise reset arc with sharp return arrow.
 */
export const RotateCcw = createIcon(
    <>
        <path d="M3 12a9 9 0 1 0 2.64-6.36L2.5 8.5" />
        <path d="M2.5 3.5v5h5" />
    </>
);
export const RotateCcwIcon = RotateCcw;

/**
 * Copy / CopyIcon
 * Dual layered document sheets with matching corner radii for clipboard feedback.
 */
export const Copy = createIcon(
    <>
        <rect width="13" height="13" x="8.5" y="8.5" rx="2" ry="2" />
        <path d="M4 15.5H3.5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v.5" />
    </>
);
export const CopyIcon = Copy;

/* =========================================================================
   Pass 3: Photography, Media & Creative Story Studio Icons
   ========================================================================= */

/**
 * Camera / CameraIcon
 * Professional mirrorless / DSLR body silhouette:
 * Defined hot shoe prism top, tactile shutter plate, and dual optical lens elements.
 */
export const Camera = createIcon(
    <>
        <path d="M14.5 4h-5L7.5 6.5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-10a2 2 0 0 0-2-2h-3.5L14.5 4z" />
        <circle cx="12" cy="13.5" r="3.75" />
        <circle cx="12" cy="13.5" r="1.5" />
    </>
);
export const CameraIcon = Camera;

/**
 * Star / StarIcon
 * Five-pointed star with harmonious proportions for Featured / Highlights toggles.
 */
export const Star = createIcon(
    <polygon points="12 2.5 15.1 8.8 22 9.8 17 14.7 18.2 21.5 12 18.2 5.8 21.5 7 14.7 2 9.8 8.9 8.8 12 2.5" />
);
export const StarIcon = Star;

/**
 * Sparkles / SparklesIcon
 * Four-point diamond sparkle stars with concave light rays for AI policy and creative tooltips.
 */
export const Sparkles = createIcon(
    <>
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
    </>
);
export const SparklesIcon = Sparkles;

/**
 * FullAlbumIcon
 * Custom uniform 6-photo masonry grid with right-hand scrollbar thumb indicator.
 */
export const FullAlbumIcon = createIcon(
    <>
        <rect x="3" y="3" width="6" height="4.2" rx="1" />
        <rect x="3" y="9.9" width="6" height="4.2" rx="1" />
        <rect x="3" y="16.8" width="6" height="4.2" rx="1" />

        <rect x="11.5" y="3" width="6" height="4.2" rx="1" />
        <rect x="11.5" y="9.9" width="6" height="4.2" rx="1" />
        <rect x="11.5" y="16.8" width="6" height="4.2" rx="1" />

        <path d="M21 3v18" strokeWidth="1" opacity="0.4" />
        <path d="M21 3.5v5.5" strokeWidth="2" />
    </>
);

/**
 * StoryCropIcon / PhoneCropIcon
 * Smartphone portrait outline (speaker notch & home bar) with intersecting photographic crop marks.
 */
export const StoryCropIcon = createIcon(
    <>
        <path d="M6 2v16a2 2 0 0 0 2 2h14" />
        <path d="M18 22V6a2 2 0 0 0-2-2H2" />
        <line x1="10" y1="6.5" x2="14" y2="6.5" />
        <line x1="10" y1="17.5" x2="14" y2="17.5" />
    </>
);
export { StoryCropIcon as PhoneCropIcon };

/* =========================================================================
   Pass 4: System, Utility & Story Studio Tabs
   ========================================================================= */

/**
 * Sun / SunIcon
 * Solar core with 8 balanced radial rays of uniform length and spacing.
 */
export const Sun = createIcon(
    <>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5" />
        <path d="M12 19.5V22" />
        <path d="m4.93 4.93 1.77 1.77" />
        <path d="m17.3 17.3 1.77 1.77" />
        <path d="M2 12h2.5" />
        <path d="M19.5 12H22" />
        <path d="m6.7 17.3-1.77 1.77" />
        <path d="m19.07 4.93-1.77 1.77" />
    </>
);
export const SunIcon = Sun;

/**
 * Moon / MoonIcon
 * Elegant lunar crescent with smooth inner curvature matching the solar disk.
 */
export const Moon = createIcon(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />);
export const MoonIcon = Moon;

/**
 * Wifi / WifiIcon
 * Concentric radio broadcast arcs emanating from a central transmission origin.
 */
export const Wifi = createIcon(
    <>
        <path d="M12 20h.01" />
        <path d="M2 8.82a15 15 0 0 1 20 0" />
        <path d="M5 12.86a10 10 0 0 1 14 0" />
        <path d="M8.5 16.43a5 5 0 0 1 7 0" />
    </>
);
export const WifiIcon = Wifi;

/**
 * WifiOff / WifiOffIcon
 * Wireless broadcast pattern with a clean diagonal disconnection strike.
 */
export const WifiOff = createIcon(
    <>
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M12 20h.01" />
        <path d="M8.5 16.43a5 5 0 0 1 7 0" />
        <path d="M5 12.86a10 10 0 0 1 5.17-2.69" />
        <path d="M19 12.86a10 10 0 0 0-2.01-1.52" />
        <path d="M2 8.82a15 15 0 0 1 4.18-2.64" />
        <path d="M22 8.82a15 15 0 0 0-11.29-3.76" />
    </>
);
export const WifiOffIcon = WifiOff;

/**
 * Code / CodeIcon
 * Balanced developer syntax chevrons for open-source and algorithm policy.
 */
export const Code = createIcon(
    <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </>
);
export const CodeIcon = Code;

/**
 * StoryLayoutTabIcon
 * 9:16 portrait story canvas with dashed internal alignment guides.
 */
export const StoryLayoutTabIcon = createIcon(
    <>
        <rect x="5" y="2" width="14" height="20" rx="2.5" />
        <line x1="10" y1="5" x2="14" y2="5" />
        <rect x="8" y="8" width="8" height="8" rx="1" strokeDasharray="2 2" strokeWidth="1.5" />
    </>
);

/**
 * StoryFiltersTabIcon
 * Intersecting tonal color circles with refraction star emblem.
 */
export const StoryFiltersTabIcon = createIcon(
    <>
        <circle cx="9" cy="11" r="5.5" />
        <circle cx="15" cy="13" r="5.5" />
        <path d="M18 2v4M16 4h4" strokeWidth="1.75" />
    </>
);

/**
 * StoryFramesTabIcon
 * Artistic photographic picture frame with precision corner brackets.
 */
export const StoryFramesTabIcon = createIcon(
    <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <rect x="7" y="7" width="10" height="10" rx="1" strokeWidth="1.5" />
        <path d="M3 8V3h5" />
        <path d="M21 8V3h-5" />
        <path d="M3 16v5h5" />
        <path d="M21 16v5h-5" />
    </>
);

/**
 * StoryBadgesTabIcon
 * Championship athletic crest shield with solid star medal emblem.
 */
export const StoryBadgesTabIcon = createIcon(
    <>
        <path d="M12 2L4 5.5v6.2c0 5.4 3.4 10.3 8 11.8 4.6-1.5 8-6.4 8-11.8V5.5L12 2Z" />
        <polygon
            points="12 7.5 13.3 10.2 16.2 10.6 14.1 12.6 14.6 15.5 12 14.1 9.4 15.5 9.9 12.6 7.8 10.6 10.7 10.2 12 7.5"
            fill="currentColor"
            stroke="none"
        />
    </>
);

/* =========================================================================
   Pass 5: Legal Modals, Trust Badges & Social Brand Logomarks
   ========================================================================= */

/**
 * Scale / ScaleIcon
 * Legal balance scale with central pillar, crossbar fulcrum, and balanced pans.
 */
export const Scale = createIcon(
    <>
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="M7 21h10" />
        <path d="M12 3v18" />
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </>
);
export const ScaleIcon = Scale;

/**
 * ShieldCheck / ShieldCheckIcon
 * Verified security and permission shield with crisp confirmation checkmark.
 */
export const ShieldCheck = createIcon(
    <>
        <path d="M12 2.5L4.5 5.8v6.2c0 5.2 3.2 10.1 7.5 11.5 4.3-1.4 7.5-6.3 7.5-11.5V5.8L12 2.5z" />
        <path d="m9 12 2 2 4-4" />
    </>
);
export const ShieldCheckIcon = ShieldCheck;

/**
 * ShieldAlert / ShieldAlertIcon
 * Protection crest with caution indicator for legal limitations and restrictions.
 */
export const ShieldAlert = createIcon(
    <>
        <path d="M12 2.5L4.5 5.8v6.2c0 5.2 3.2 10.1 7.5 11.5 4.3-1.4 7.5-6.3 7.5-11.5V5.8L12 2.5z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
    </>
);
export const ShieldAlertIcon = ShieldAlert;

/**
 * UserCheck / UserCheckIcon
 * Photographer & creator attribution badge with verification check.
 */
export const UserCheck = createIcon(
    <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
    </>
);
export const UserCheckIcon = UserCheck;

/**
 * RefreshCw / RefreshCwIcon
 * Symmetrical twin clockwise renewal arrows for licensing and modifications.
 */
export const RefreshCw = createIcon(
    <>
        <path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" />
        <path d="M3 21v-5h5" />
    </>
);
export const RefreshCwIcon = RefreshCw;

/**
 * FacebookIcon
 * Official Facebook brand logomark in standard 24x24 canvas.
 */
export const FacebookIcon = createIcon(
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />,
    { fill: 'currentColor', stroke: 'none', strokeWidth: 0, defaultSize: 18 }
);

/**
 * InstagramIcon
 * Official Instagram camera logomark in standard 24x24 canvas.
 */
export const InstagramIcon = createIcon(
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />,
    { fill: 'currentColor', stroke: 'none', strokeWidth: 0, defaultSize: 18 }
);

/**
 * GithubIcon
 * Official GitHub Octocat logomark in standard 24x24 canvas.
 */
export const GithubIcon = createIcon(
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />,
    { fill: 'currentColor', stroke: 'none', strokeWidth: 0, defaultSize: 18 }
);
