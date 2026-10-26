/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import React, { ReactNode, useEffect } from 'react';

import LWPButton from './../../Shared/Button/LWPButton';
import Heading2 from './../../Shared/Typography/Heading2';

interface DialogWrapperProps {
    open?: boolean;
    setOpen?: any;
    heading?: string;
    subHeading?: ReactNode;
    children?: ReactNode;
    customFooter?: ReactNode;
    primaryBtnHandler?: () => void;
    primaryBtnText?: string;
    primaryBtnClass?: string;
    secondaryBtn?: string;
    secondaryBtnHandler?: () => void;
    cancelBtn?: boolean;
    filterBtn?: string;
    filterBtnHandler?: () => void;
    dialogFooter?: boolean;
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    bigModal?: boolean;
    filterBtnColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    onClose?: () => void;
    primaryBtnloading?: boolean;
    primaryBtnDisabled?: boolean;
    secondaryBtnloading?: boolean;
    fullWidth?: boolean;
    cancelBtnText?: string;
    className?: string;
    contentWidth?: string;
    dialog_content_class?: string;
    filterBtnSecondaryHandler?: () => void;
    filterBtnSecondaryText?: string;
    filterBtnSecondaryloading?: boolean;
    primaryBtnColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    scroll?: 'body' | 'paper';
    primaryBtnEndIcon?: string;
    dataTest?: string;
}

const DialogWrapper = ({
    open,
    setOpen,
    heading,
    subHeading,
    children,
    primaryBtnHandler,
    primaryBtnText,
    primaryBtnClass,
    secondaryBtn,
    secondaryBtnHandler,
    cancelBtn,
    filterBtn,
    filterBtnHandler,
    dialogFooter,
    fullWidth,
    filterBtnColor,
    onClose,
    primaryBtnloading,
    primaryBtnDisabled,
    secondaryBtnloading,
    cancelBtnText,
    className,
    contentWidth = '484px',
    dialog_content_class,
    filterBtnSecondaryHandler,
    filterBtnSecondaryText,
    filterBtnSecondaryloading,
    primaryBtnEndIcon,
    primaryBtnColor = 'primary',
    scroll = 'body',
    customFooter = null,
    dataTest
}: DialogWrapperProps) => {
    useEffect(() => {
        if (open && setOpen) {
            window?.history?.pushState(true, '', '');
            window.onpopstate = function (event) {
                if (event) {
                    setOpen(!open);
                }
            };
        }
    }, []);

    return (
        <Dialog
            open={open}
            scroll={scroll}
            onClose={onClose ? onClose : setOpen ? () => setOpen(false) : () => {}}
            className={`dialog-wrapper ${className}`}
            fullWidth={fullWidth}
            PaperProps={{ sx: { maxWidth: `${contentWidth} !important` } }}
            data-test={dataTest}>
            <div className="dialog-content-section" style={{ width: '100%', boxSizing: 'border-box' }}>
                <div className={filterBtn ? 'dialog-btn-section' : ''}>
                    {(heading || subHeading) && (
                        <DialogTitle className="dialog-title" sx={{ pb: 0 }}>
                            {heading && <Heading2 dataTest="dialog-title-heading" text={heading} />}
                            {subHeading}
                        </DialogTitle>
                    )}
                    {filterBtn && (
                        <LWPButton
                            size={'large'}
                            variant="contained"
                            btnText={filterBtn}
                            onClick={filterBtnHandler}
                            customClass="filter-btn"
                            color={filterBtnColor ? filterBtnColor : 'inherit'}
                        />
                    )}
                    {filterBtnSecondaryText && (
                        <div className="dialog-side-btn">
                            <DialogActions className="dialog-action">
                                <LWPButton
                                    size={'large'}
                                    variant="contained"
                                    color="inherit"
                                    onClick={filterBtnSecondaryHandler}
                                    btnText={filterBtnSecondaryText}
                                    loading={filterBtnSecondaryloading}
                                />
                            </DialogActions>
                        </div>
                    )}
                </div>
                <DialogContent data-test="dialog-content" className={dialog_content_class}>
                    {children}
                </DialogContent>
                {dialogFooter ? (
                    <div className={secondaryBtn ? 'dialog-btn-section' : ''}>
                        {secondaryBtn && (
                            <LWPButton
                                size={'large'}
                                variant="contained"
                                btnText={secondaryBtn}
                                onClick={secondaryBtnHandler}
                                color="inherit"
                                loading={secondaryBtnloading}
                                dataTest="dialog-secondary-btn"
                            />
                        )}
                        <div className="dialog-side-btn">
                            {(cancelBtn || cancelBtnText) && (
                                <LWPButton
                                    size={'large'}
                                    variant="text"
                                    onClick={setOpen}
                                    btnText={cancelBtnText || 'Cancel'}
                                    color="inherit"
                                    dataTest="dialog-cancel-btn"
                                />
                            )}
                            {primaryBtnText && (
                                <DialogActions className="dialog-action">
                                    <LWPButton
                                        size={'large'}
                                        variant="contained"
                                        color={primaryBtnColor}
                                        customClass={primaryBtnClass}
                                        disabled={primaryBtnDisabled}
                                        onClick={primaryBtnHandler}
                                        btnText={primaryBtnText}
                                        loading={primaryBtnloading}
                                        endIcon={primaryBtnEndIcon}
                                        dataTest="dialog-primary-btn"
                                    />
                                </DialogActions>
                            )}
                        </div>
                    </div>
                ) : (
                    ''
                )}
                {!dialogFooter && customFooter ? customFooter : null}
            </div>
        </Dialog>
    );
};

export default DialogWrapper;
