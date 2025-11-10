import React from 'react';

interface FallbackIconProps {
    /** The name of the extension to generate the fallback icon for */
    name: string;
}

/**
 * Fallback SVG icon component displayed when an extension has no icon
 * Uses the first letter of the extension name on a gray background
 */
export function FallbackIcon({ name }: FallbackIconProps): React.JSX.Element {
    const firstLetter = name.charAt(0).toUpperCase();

    return (
        <svg
            className="extension-icon extension-icon-fallback"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="32" height="32" rx="6" fill="#6c757d" />
            <text
                x="16"
                y="22"
                textAnchor="middle"
                fill="white"
                fontSize="18"
                fontWeight="600"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            >
                {firstLetter}
            </text>
        </svg>
    );
}
