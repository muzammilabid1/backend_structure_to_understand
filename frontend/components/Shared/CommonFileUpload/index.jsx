/* eslint-disable @next/next/no-img-element */
import { nanoid } from 'nanoid';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import { _getImageFileToBase64 } from '../../../shared/Services/handler';
import CommonIconButton from './../Button/CommonIconButton';
import CommonError from './../CommonError';
import Paragraph from './../Typography/Paragraph';

const CommonFileUpload = ({
    setFileName,
    previewImage,
    onClose,
    onSave,
    onSetFileName,
    onSetFileID,
    disabled,
    heading,
    icon,
    customClass,
    name,
    error,
    touched,
    multiple,
    fileNames,
    fileIds,
    accept
}) => {
    const [type, setType] = useState('');
    const imageMimeTypes = ['webp', 'svg', 'png', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'gif', 'avif', 'apng'];
    const audioMimeTypes = ['wav', 'vorbis', 'ogg', 'mpeg', 'mp3', '3gp', 'webm'];

    useEffect(() => {
        if (!multiple) {
            if (!type && previewImage && imageMimeTypes.some((t) => getFileFormat(previewImage).toLowerCase().includes(t.toLowerCase()))) {
                setType('image');
            } else if (
                !type &&
                previewImage &&
                (getFileFormat(previewImage) === 'pdf' || getFileFormat(previewImage).toLowerCase() === 'pdf')
            ) {
                setType('application/pdf');
            } else if (!type && previewImage && audioMimeTypes.some((t) => t.toLowerCase() === getFileFormat(previewImage).toLowerCase())) {
                setType('audio');
            } else {
                setType('not-image');
            }
        } else {
            setType('image');
        }
    }, []);

    const getFileFormat = (image) => {
        const splitImage = image?.replace(' ', '')?.split('.');

        return splitImage?.length > 0 ? splitImage?.[splitImage?.length - 1] : '';
    };

    const getFileNameWithoutFormat = (fileName) => {
        const splitFileName = fileName?.trim()?.split('.');

        return splitFileName?.length > 0 ? splitFileName?.splice(0, splitFileName?.length - 1)?.join('.') : 'filename';
    };

    const getFile = async (file) => {
        setFileName(file.name);

        const base64 = await _getImageFileToBase64(file);

        const arr = base64?.split(',');
        const mime = arr?.[0].match(/:(.*?);/)?.[1];

        setType(mime);

        const fileName = getFileNameWithoutFormat(file?.name);
        const fileID = nanoid();

        onSetFileName(fileName);

        onSetFileID(fileID);

        onSave(base64);
    };

    const getFiles = async (files) => {
        const fileNames = [];
        const fileIds = [];
        const fileUrls = [];

        for (const file of files) {
            const base64 = await _getImageFileToBase64(file);

            const fileName = getFileNameWithoutFormat(file?.name);
            const fileID = nanoid();

            fileNames.push(fileName);
            fileIds.push(fileID);
            fileUrls.push(base64);
        }

        onSetFileName(fileNames);

        onSetFileID(fileIds);

        onSave(fileUrls);
    };

    return (
        <div className={`image_upload_neated_container ${customClass} ${disabled ? 'all_events_disabled' : ''}`}>
            {heading && <Paragraph style={{ fontWeight: 'bold' }}>{heading}</Paragraph>}
            <br />

            <input
                name={name}
                type="file"
                accept={accept}
                multiple={multiple ? true : false}
                onChange={(e) => {
                    if (!multiple) {
                        e.currentTarget.files[0] && getFile(e.currentTarget.files[0]);
                    } else {
                        e.currentTarget.files.length > 0 && getFiles(e.currentTarget.files);
                    }
                }}
            />

            <br />

            {multiple ? (
                <div className="file-upload-images-preview">
                    {previewImage.length > 0 ? (
                        previewImage.map((image, index) => (
                            <div className="file-upload-image-preview">
                                {image && (
                                    <CommonIconButton
                                        onClick={() => {
                                            if (previewImage.length === 0) {
                                                setType('');
                                                onClose([], [], []);
                                            } else {
                                                setType('image');
                                                previewImage.splice(index, 1);
                                                fileNames.splice(index, 1);
                                                fileIds.splice(index, 1);

                                                onClose(previewImage, fileNames, fileIds);
                                            }
                                        }}
                                        className="clear-button"
                                        icon="clear"
                                    />
                                )}
                                {type.startsWith('image') && image ? (
                                    <img src={image} className="image-preview" data-test='common-file-upload-multi-image-preview' alt="Image preview" />
                                ) : type.startsWith('application/pdf') ? (
                                    <span className="material-icons upload-camera-icon">{'picture_as_pdf'}</span>
                                ) : type.startsWith('audio') ? (
                                    <span className="material-icons upload-camera-icon">{'audio_file'}</span>
                                ) : (
                                    <span className="material-icons upload-camera-icon">{icon}</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="file-upload-image-preview">
                            <span className="material-icons upload-camera-icon">{icon}</span>
                            <CommonError error={error} touched={touched} />
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {previewImage && (
                        <CommonIconButton
                            onClick={() => {
                                onClose();
                                setType('');
                            }}
                            className="clear-button"
                            icon="clear"
                        />
                    )}
                    {type.startsWith('image') && previewImage ? (
                        <img src={previewImage} className="image-preview" data-test='common-file-upload-single-image-preview' alt="Image preview" />
                    ) : type.startsWith('application/pdf') ? (
                        <span className="material-icons upload-camera-icon">{'picture_as_pdf'}</span>
                    ) : type.startsWith('audio') ? (
                        <span className="material-icons upload-camera-icon">{'audio_file'}</span>
                    ) : (
                        <span className="material-icons upload-camera-icon">{icon}</span>
                    )}
                    <CommonError error={error} touched={touched} />
                </>
            )}
        </div>
    );
};

CommonFileUpload.propTypes = {
    setFileName: PropTypes.func.isRequired,
    fileNames: PropTypes.array,
    fileIds: PropTypes.array,
    previewImage: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onSetFileName: PropTypes.func.isRequired,
    onSetFileID: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    heading: PropTypes.string,
    icon: PropTypes.string.isRequired,
    customClass: PropTypes.string,
    name: PropTypes.string,
    error: PropTypes.string,
    touched: PropTypes.bool,
    multiple: PropTypes.bool,
    accept: PropTypes.string
};

CommonFileUpload.defaultProps = {
    setFileName: () => {},
    previewImage: '',
    onClose: () => {},
    onSave: () => {},
    fileNames: [],
    fileIds: [],
    onSetFileName: () => {},
    onSetFileID: () => {},
    multiple: false,
    disabled: false,
    accept: '*'
};

export default CommonFileUpload;
