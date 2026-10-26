/* eslint-disable @next/next/no-img-element */
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Cropper from 'cropperjs';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

import LWPButton from './../Button/LWPButton';

const maxImageSizeAllowed = 1024;

const createCropper = (element, aspectRatio) =>
    new Cropper(element, {
        zoomable: false,
        scalable: false,
        rotatable: true,
        autoCrop: false,
        aspectRatio,
        dragMode: 'none'
    });

const ImageEditor = ({ src, aspectRatio, onSave, onCancel, loading = false, convertToJpeg = true }) => {
    const theme = useTheme();
    const imageRef = useRef(null);
    const notMobile = useMediaQuery(theme.breakpoints.up('sm'));
    const maxPx = notMobile ? '500px' : '300px';
    const [cropMode, setCropMode] = useState(false);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);

        const canvas = imageRef?.current?.cropper?.getCroppedCanvas({ maxWidth: maxImageSizeAllowed, maxHeight: maxImageSizeAllowed });

        if (canvas) {
            let dataUrl;

            if (convertToJpeg) {
                dataUrl = canvas.toDataURL('image/jpeg');
            } else {
                dataUrl = canvas.toDataURL('image/png');
            }

            await onSave(dataUrl);
        }

        setSaving(false);
    };

    useEffect(() => {
        if (imageRef && imageRef.current && src) {
            createCropper(imageRef.current, aspectRatio);
        }
    }, [imageRef, createCropper, aspectRatio, src]);

    const toggleCropMode = () => {
        const nextCropMode = !cropMode;

        setCropMode(nextCropMode);
        if (nextCropMode) {
            imageRef?.current?.cropper?.crop();
        } else {
            imageRef?.current?.cropper?.clear();
        }
    };

    return (
        <div className="image_editor_container">
            <div>
                <img
                    ref={imageRef}
                    src={src}
                    alt="Image"
                    crossOrigin="true"
                    style={{ maxWidth: maxPx, height: 'auto', maxHeight: notMobile ? '600px' : '290px' }}
                />
            </div>

            <div className="mt3 crop_btn_group">
                <LWPButton color="inherit" variant="text" endIcon="crop" btnText="Crop image" onClick={toggleCropMode} />

                <LWPButton
                    color="inherit"
                    variant="text"
                    size="medium"
                    endIcon="rotate_right"
                    btnText="Rotate image"
                    onClick={() => {
                        imageRef?.current?.cropper?.rotate ? imageRef?.current?.cropper.rotate(90) : '';
                    }}
                />

                <LWPButton
                    color="inherit"
                    variant="text"
                    size="medium"
                    endIcon="history"
                    btnText="Reset image"
                    onClick={() => {
                        imageRef?.current?.cropper?.reset ? imageRef?.current?.cropper.reset() : '';
                    }}
                />
            </div>

            <div className="btn_group">
                <LWPButton
                    customClass="cancel_btn"
                    variant="text"
                    onClick={onCancel}
                    btnText="Cancel"
                    color="inherit"
                    disabled={saving || loading}
                    dataTest="image-editor-cancel-btn"
                />
                <LWPButton
                    color="primary"
                    btnText="Save changes"
                    onClick={save}
                    disabled={saving}
                    loading={loading}
                    dataTest="image-editor-save-btn"
                />
            </div>
        </div>
    );
};

ImageEditor.propTypes = {
    src: PropTypes.string.isRequired,
    aspectRatio: PropTypes.number,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func,
    loading: PropTypes.bool,
    convertToJpeg: PropTypes.bool
};

ImageEditor.defaultProps = {
    src: '',
    onSave: () => {}
};

export default ImageEditor;
