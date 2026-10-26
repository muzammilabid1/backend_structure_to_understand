/* eslint-disable @next/next/no-img-element */
import { gql, useMutation } from '@apollo/client';
import { CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DropzoneArea } from 'mui-file-dropzone';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { _getImageFileToBase64, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import LWPButton from '../../Shared/Button/LWPButton';
import ImageEditorDialog from '../../Shared/ImageEditorDialog';
import Paragraph from '../../Shared/Typography/Paragraph';

const maxFileSize = 50000000; // 50MB

// `display: none` inputs are refused a file picker by some Android browsers, so keep these in the
// layout but move them out of sight.
const offscreenInput = { position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0, overflow: 'hidden' };

const getS3PresignedUploadUrl = gql`
    mutation getS3PresignedUploadUrl($fileName: String!, $feedbackType: FeedbackType!) {
        presignedUrlForFeedbackMedia(fileName: $fileName, mediaType: PHOTO, feedbackType: $feedbackType) {
            token
            url
        }
    }
`;

const UploadFile = ({
    setFileName,
    previewImage,
    onClose,
    onSave,
    disabled,
    heading,
    icon,
    acceptedFiles,
    btnTitle,
    btnClass,
    isCropper,
    fileSource,
    customClass,
    isShowCancelIcon,
    canRemove,
    showIcon = true,
    children,
    feedbackType,
    abort,
    onSaveStart,
    onSaveEnd,
    skipPresignedUrl,
    openSourceOnMount
}) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState(null);
    const [_fileName, _setFileName] = useState('');
    const [saving, setSaving] = useState(false);
    const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const [uploadUrlMutation] = useMutation(getS3PresignedUploadUrl);

    // Resolved after mount so the server render and the first client render agree.
    useEffect(() => {
        setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
    }, []);

    // Lets a caller that already took a tap to get here go straight to the choice.
    useEffect(() => {
        if (!openSourceOnMount || !isTouchDevice || previewImage) return;

        setSourceDialogOpen(true);
    }, [openSourceOnMount, isTouchDevice]);

    /**
     * Chrome sends a file input that accepts only images to the Android photo picker, which has no
     * camera. Rather than widening `accept` to dodge that, we offer the choice ourselves and point
     * each option at its own input - `capture` sends one straight to the camera app. Touch only:
     * desktop browsers ignore `capture`, so a camera option there would just open a file dialog.
     */
    const showSourceMenu = (e) => {
        // Both dialogs below are React children of this container, and a portal still propagates
        // events through the React tree - so without this their own clicks are swallowed here.
        if (sourceDialogOpen || open) return;
        if (!isTouchDevice || disabled || saving) return;
        // The two inputs below live inside this container, so their own clicks reach this handler.
        // Cancelling those would cancel the very picker we are trying to open.
        if (e.target.tagName === 'INPUT' && e.target.type === 'file') return;
        // The button reopens the cropper when a photo is already set, and the clear icon removes it.
        if (!isShowCancelIcon && previewImage !== '') return;
        if (e.target.closest('.cancel-photo')) return;

        e.preventDefault();
        e.stopPropagation();

        setSourceDialogOpen(true);
    };

    const pickFrom = (ref) => {
        setSourceDialogOpen(false);
        ref.current?.click();
    };

    const onPickedFile = (e) => {
        const file = e.target.files[0];

        // Clearing lets the same file be chosen again after it has been removed.
        e.target.value = '';

        if (!file) return;

        // The drop area checks the size itself; these inputs bypass it.
        if (file.size > maxFileSize) {
            callSnackbar('That photo is too big. Please choose one under 50MB.', 'error');
            return;
        }

        getFile(file);
    };

    const getFile = async (file) => {
        const ext = (file.name ? file.name.split('.').pop() : file.path.split('.').pop()).toLowerCase();

        let base64 = '';
        let fileName = '';

        if (ext === 'heic' || ext === 'heif') {
            // Dynamic import of heic2any
            const heic2any = (await import('heic2any')).default;

            // Convert HEIC/HEIF file to JPEG Blob
            const blob = await heic2any({
                blob: file, // Use the original file object
                toType: 'image/jpeg',
                quality: 0.7 // adjust quality as needed
            });

            base64 = await _getImageFileToBase64(blob);
            fileName = `${file.name.split('.').shift()}.jpeg`;
        } else {
            fileName = file.name;
            base64 = await _getImageFileToBase64(file);
        }

        _setFileName(fileName);

        setFileName(fileName);

        if (isCropper) {
            setUrl(base64);
            setOpen(true);
        } else {
            onSaveShim(base64);
        }
    };

    const onSaveShim = async (b64_url) => {
        setOpen(false);
        setSaving(true);
        onSaveStart();

        if (skipPresignedUrl) {
            onSave({ token: null, preview: b64_url });
            setSaving(false);
            onSaveEnd();
            return;
        }

        const blob = await (await fetch(b64_url)).blob();

        uploadUrlMutation({ variables: { fileName: _fileName, feedbackType } }).then(
            ({
                data: {
                    presignedUrlForFeedbackMedia: { url, token }
                }
            }) => {
                fetch(url, {
                    method: 'PUT',
                    body: blob,
                    signal: abort?.signal
                })
                    .then(() => {
                        return onSave({ token, preview: b64_url });
                    })
                    .catch((e) => {
                        console.log(e);
                        if (e?.name !== 'AbortError') {
                            window.newrelic?.noticeError(e, { caught: true, handled: false, in: 'UploadFile' });
                            callSnackbar('Failed to upload image!', 'error');
                        }
                    })
                    .finally(() => {
                        setSaving(false);
                        onSaveEnd();
                    });
            }
        );
    };

    const onCancel = () => {
        setUrl(null);
        setOpen(false);
    };

    return (
        <div
            className={`image_upload_neated_container ${customClass} ${disabled ? 'all_events_disabled' : ''}`}
            onClickCapture={showSourceMenu}>
            <div className="cancel-photo">
                {previewImage && isShowCancelIcon && canRemove && <CommonIconButton onClick={onClose} icon="clear" />}
            </div>

            {heading && (
                <Paragraph customClass="file-uploader-heading" style={{ fontWeight: 'bold' }}>
                    {heading}
                </Paragraph>
            )}

            <DropzoneArea
                maxFileSize={maxFileSize}
                showPreviewsInDropzone={false}
                acceptedFiles={acceptedFiles}
                dropzoneClass="dropzone-container"
                dropzoneParagraphClass="dropzone-para"
                filesLimit={1}
                dropzoneText={
                    children ? (
                        children
                    ) : (
                        <LWPButton
                            customClass={btnClass}
                            btnText={
                                saving
                                    ? 'Saving...'
                                    : !isShowCancelIcon && previewImage !== ''
                                      ? 'Edit photo'
                                      : previewImage
                                        ? 'Replace photo'
                                        : fileSource
                                          ? 'Replace file Source'
                                          : btnTitle
                            }
                            onClick={(e) => {
                                if (!isShowCancelIcon && previewImage !== '') {
                                    e.stopPropagation();
                                    setOpen(true);
                                }
                            }}
                            disabled={saving}
                            startIcon={!isShowCancelIcon && previewImage !== '' ? 'edit' : ''}
                            color={!isShowCancelIcon && previewImage !== '' ? 'inherit' : 'primary'}
                        />
                    )
                }
                onChange={(e) => {
                    e?.[0] && getFile(e[0]);
                }}
                Icon={() =>
                    showIcon ? (
                        previewImage ? (
                            <img
                                src={previewImage || previewImage?.preview}
                                className="image-preview"
                                data-test="upload-file-image-preview"
                                alt="Image preview"
                            />
                        ) : fileSource ? (
                            <span className="truncate">{fileSource}</span>
                        ) : saving ? (
                            <CircularProgress />
                        ) : (
                            <span className="material-icons upload-camera-icon">{icon}</span>
                        )
                    ) : (
                        ''
                    )
                }
            />

            {isTouchDevice && (
                <>
                    <input
                        type="file"
                        style={offscreenInput}
                        ref={cameraInputRef}
                        accept={acceptedFiles.join(',')}
                        capture="environment"
                        data-test="upload-file-camera-input"
                        onChange={onPickedFile}
                    />
                    <input
                        type="file"
                        style={offscreenInput}
                        ref={galleryInputRef}
                        accept={acceptedFiles.join(',')}
                        data-test="upload-file-gallery-input"
                        onChange={onPickedFile}
                    />
                </>
            )}

            <Dialog open={sourceDialogOpen} onClose={() => setSourceDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Add a photo</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pb: 1 }}>
                    <LWPButton
                        fullWidth
                        btnText="Take a photo"
                        startIcon="photo_camera"
                        onClick={() => pickFrom(cameraInputRef)}
                        dataTest="upload-file-take-photo"
                    />
                    <LWPButton
                        fullWidth
                        btnText="Choose from gallery"
                        startIcon="photo_library"
                        color="inherit"
                        onClick={() => pickFrom(galleryInputRef)}
                        dataTest="upload-file-choose-photo"
                    />
                </DialogContent>
                <DialogActions>
                    <LWPButton variant="text" color="inherit" btnText="Cancel" onClick={() => setSourceDialogOpen(false)} />
                </DialogActions>
            </Dialog>

            {open && (
                <ImageEditorDialog
                    open={open}
                    setOpen={() => setOpen(false)}
                    src={url}
                    onSave={async (url) => onSaveShim(url)}
                    onCancel={onCancel}
                />
            )}
        </div>
    );
};

UploadFile.propTypes = {
    setFileName: PropTypes.func.isRequired,
    previewImage: PropTypes.string.isRequired,
    fileSource: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    heading: PropTypes.string,
    icon: PropTypes.string.isRequired,
    acceptedFiles: PropTypes.array.isRequired,
    btnTitle: PropTypes.string.isRequired,
    btnClass: PropTypes.string,
    customClass: PropTypes.string,
    isCropper: PropTypes.bool,
    isShowCancelIcon: PropTypes.bool,
    canRemove: PropTypes.bool,
    showIcon: PropTypes.bool,
    children: PropTypes.element,
    feedbackType: PropTypes.string,
    abort: PropTypes.instanceOf(AbortController),
    onSaveStart: PropTypes.func,
    onSaveEnd: PropTypes.func,
    skipPresignedUrl: PropTypes.bool,
    openSourceOnMount: PropTypes.bool
};

UploadFile.defaultProps = {
    setFileName: () => {},
    previewImage: '',
    onClose: () => {},
    onSave: () => {},
    disabled: false,
    icon: 'camera_alt',
    acceptedFiles: ['image/jpeg', 'image/png', 'image/bmp', 'image/heic', '.heic', '.heif'],
    btnTitle: 'Upload a photo',
    heading: 'Thumbnail image',
    isCropper: true,
    isShowCancelIcon: true,
    canRemove: true,
    feedbackType: 'READING',
    onSaveStart: () => {},
    onSaveEnd: () => {},
    skipPresignedUrl: false,
    openSourceOnMount: false
};

export default UploadFile;
