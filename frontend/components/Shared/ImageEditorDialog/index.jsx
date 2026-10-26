import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { ThemeContext } from '../../../shared/Services/handler';
import DialogWrapper from '../DialogWrapper';
import ImageEditor from '../ImageEditor';

const validityStates = {
    invalid: 0,
    unchecked: -1,
    valid: 1
};

const ImageEditorDialog = ({ open, setOpen, src, onSave, onCancel }) => {
    const [isValidImageFile, setIsValidImageFile] = useState(validityStates.unchecked);

    const { callSnackbar } = useContext(ThemeContext);

    useEffect(() => {
        setIsValidImageFile(validityStates.unchecked);
    }, [src]);

    useEffect(() => {
        if (isValidImageFile === validityStates.valid) {
            onSave(src);
        }
    }, [isValidImageFile]);

    useEffect(() => {
        if (isValidImageFile === 0) {
            callSnackbar('Unable to upload image file. Please check your image and try again.', 'error');
            setIsValidImageFile(validityStates.unchecked);
        }
    }, [isValidImageFile]);

    return (
        <DialogWrapper open={open} setOpen={setOpen} heading="Edit image">
            <ImageEditor src={src} onSave={onSave} onCancel={onCancel} />
        </DialogWrapper>
    );
};

ImageEditorDialog.propTypes = {
    src: PropTypes.string.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    setOpen: PropTypes.func,
    open: PropTypes.bool
};

ImageEditorDialog.defaultProps = {
    src: '',
    open: false,
    onSave: () => {},
    onCancel: () => {}
};

export default ImageEditorDialog;
