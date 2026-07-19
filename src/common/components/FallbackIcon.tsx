import React from 'react';

interface FallbackIconProps {
    /** The name of the extension to generate the fallback icon for */
    name: string;
}

/**
 * Fallback SVG icon component displayed when an extension has no icon.
 * Uses the first letter of the extension name on a neutral surface,
 * colored through the shared design tokens (see theme.css).
 */
export function FallbackIcon({ name }: FallbackIconProps): React.JSX.Element {
    const firstLetter = name.charAt(0).toUpperCase();

    return (
        <svg
            className="record-fallback"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            role="presentation"
        >
            <rect width="32" height="32" rx="8" />
            <text
                x="16"
                y="21.5"
                textAnchor="middle"
                fontSize="15"
                fontWeight="600"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            >
                {firstLetter}
            </text>
        </svg>
    );
}
