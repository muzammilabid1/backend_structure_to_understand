/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import DialogWrapper from './../DialogWrapper';
interface Props {
    open?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    btnText?: string;
    btnClass?: string;
    cancelBtnText?: string;
    primaryBtnColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    maxWidth?: string;
    heading?: string;
    subHeading?: string;
    contentWidth?: string;
    primaryBtnDisabled?: boolean;
    cancelBtn?: boolean;
    className?: string;
    primaryBtnEndIcon?: string;
    children?: React.ReactNode;
    isDeleteConfirmation?: boolean;
}

export default function ConfirmationModal({
    onConfirm = () => {},
    onCancel = () => {},
    loading = false,
    open = false,
    btnText = 'Delete',
    btnClass,
    heading = 'Delete item',
    children = 'Are you sure you want to delete this item?',
    cancelBtnText,
    primaryBtnDisabled,
    primaryBtnEndIcon,
    primaryBtnColor,
    subHeading,
    className,
    cancelBtn = true,
    isDeleteConfirmation = false,
    contentWidth = '651px'
}: Props) {
    return (
        <DialogWrapper
            primaryBtnHandler={onConfirm}
            primaryBtnText={btnText}
            primaryBtnloading={loading}
            primaryBtnDisabled={primaryBtnDisabled}
            primaryBtnEndIcon={primaryBtnEndIcon}
            dialogFooter
            primaryBtnColor={primaryBtnColor}
            primaryBtnClass={btnClass}
            setOpen={onCancel}
            cancelBtnText={cancelBtnText}
            open={open}
            contentWidth={contentWidth}
            cancelBtn={cancelBtn}
            className={`confirmation-modal ${isDeleteConfirmation ? 'delete-confirmation-modal' : ''} ${className}`}
            // Just for compatibility with prop-types
            subHeading={subHeading as any}
            heading={heading}>
            {/* Just for compatibility with prop-types */}
            {children as any}
        </DialogWrapper>
    );
}
