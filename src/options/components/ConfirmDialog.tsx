import React from 'react';

/**
 * Props for the ConfirmDialog component
 */
interface ConfirmDialogProps {
    /** Whether the dialog is currently visible */
    isOpen: boolean;
    /** Title text displayed in the dialog header */
    title: string;
    /** Message text displayed in the dialog body */
    message: string;
    /** Text for the confirmation button */
    confirmText: string;
    /** Text for the cancel button */
    cancelText: string;
    /** Callback invoked when the user confirms the action */
    onConfirm: () => void;
    /** Callback invoked when the user cancels or closes the dialog */
    onCancel: () => void;
}

/**
 * Modal confirmation dialog component
 * Replaces browser's native window.confirm with a proper accessible modal
 */
export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
}: ConfirmDialogProps): React.JSX.Element | null {
    if (!isOpen) {
        return null;
    }

    const handleConfirm = () => {
        onConfirm();
    };

    const handleCancel = () => {
        onCancel();
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <div
            className="modal-overlay"
            onClick={handleOverlayClick}
            onKeyDown={handleKeyDown}
            role="presentation"
        >
            <div
                className="modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-message"
            >
                <div className="modal-header">
                    <h5 id="dialog-title" className="modal-title">
                        {title}
                    </h5>
                </div>
                <div className="modal-body">
                    <p id="dialog-message">{message}</p>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                        {cancelText}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={handleConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
