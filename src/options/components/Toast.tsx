import React, { useEffect } from 'react';

const AUTO_DISMISS_MS = 7000;

interface ToastProps {
    message: string;
    actionLabel: string;
    onAction: () => void;
    onDismiss: () => void;
}

/**
 * Transient confirmation toast with a single action (e.g. Undo).
 * Announced politely to screen readers and dismissed automatically.
 *
 * @param root0
 * @param root0.message
 * @param root0.actionLabel
 * @param root0.onAction
 * @param root0.onDismiss
 */
export function Toast({
    message,
    actionLabel,
    onAction,
    onDismiss,
}: ToastProps): React.JSX.Element {
    useEffect(() => {
        const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="toast" role="status" aria-live="polite">
            <span className="toast-message">{message}</span>
            <button type="button" className="toast-action" onClick={onAction}>
                {actionLabel}
            </button>
        </div>
    );
}
