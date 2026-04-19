/**
 * Unified icon props for all custom SVG icons.
 * Extends SVGProps so every icon accepts the full set of SVG attributes
 * (className, style, aria-*, onClick, etc.) plus a convenient `size` shorthand.
 */
export type IconProps = React.SVGProps<SVGSVGElement> & { size?: number | string };

/**
 * CameraFaviconIcon
 * Custom SVG camera icon matching the site favicon shape.
 * Used in the About section gear list.
 */
export const CameraFaviconIcon = ({ size = 18, className, style, ...props }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="200 50 230 230"
        width={size}
        height={size}
        className={className}
        style={{ flexShrink: 0, ...style }}
        {...props}
    >
        <g transform="translate(315, 185) scale(0.65) translate(-230, -256)">
            <path
                d="M 120 146 L 176 146 L 206 86 L 306 86 L 336 146 L 380 146 A 20 20 0 0 1 400 166 L 400 346 A 20 20 0 0 1 380 366 L 80 366 A 20 20 0 0 1 60 346 L 60 216 Q 60 146 120 146 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="30"
                strokeLinejoin="round"
            />
            <circle cx="245" cy="248" r="65" fill="none" stroke="currentColor" strokeWidth="30" />
        </g>
    </svg>
);

/**
 * TikTokIcon
 * Custom SVG TikTok brand icon.
 * Used in the About section social links for Sacramento Roller Derby.
 */
export const TikTokIcon = ({ size = 18, className, style, ...props }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill="currentColor"
        className={className}
        viewBox="0 0 16 16"
        style={{ flexShrink: 0, ...style }}
        {...props}
    >
        <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z" />
    </svg>
);

/**
 * FeaturedGridIcon
 * Custom SVG icon representing a masonry-style photo grid with a scrollbar indicator.
 * Used in the portfolio event toggle between featured and full-album views.
 */
export const FeaturedGridIcon = ({ size = 24, className = '', style, ...props }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={{ flexShrink: 0, ...style }}
        {...props}
    >
        {/* Left Column (2 Big) */}
        <rect x="2" y="2" width="7" height="8.5" rx="1" />
        <rect x="2" y="13.5" width="7" height="8.5" rx="1" />
        {/* Middle Column (3 Small) */}
        <rect x="12" y="2" width="6" height="4.66" rx="1" />
        <rect x="12" y="9.66" width="6" height="4.66" rx="1" />
        <rect x="12" y="17.33" width="6" height="4.66" rx="1" />
        {/* Scrollbar */}
        <path d="M22 2v20" strokeWidth="1" />
        <path d="M22 2v6" strokeWidth="2" />
    </svg>
);

/**
 * FacebookIcon
 * Official Facebook "f" logomark in a rounded square.
 * Replaces the deprecated lucide-react Facebook icon.
 */
export const FacebookIcon = ({ size = 18, className, style, ...props }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        style={{ flexShrink: 0, ...style }}
        {...props}
    >
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
);

/**
 * InstagramIcon
 * Official Instagram camera logomark.
 * Replaces the deprecated lucide-react Instagram icon.
 */
export const InstagramIcon = ({ size = 18, className, style, ...props }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        style={{ flexShrink: 0, ...style }}
        {...props}
    >
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
    </svg>
);

/**
 * GithubIcon
 * Official GitHub logomark.
 * Replaces the deprecated lucide-react Github icon.
 */
export const GithubIcon = ({ size = 18, className, style, ...props }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        style={{ flexShrink: 0, ...style }}
        {...props}
    >
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
);
