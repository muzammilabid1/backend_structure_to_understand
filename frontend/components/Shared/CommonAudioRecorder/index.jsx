import { gql, useMutation, useQuery } from '@apollo/client';
import { FormHelperText } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { recordAudioToMp3, ThemeContext } from '../../../shared/Services/handler';
import AudioPlayer from '../../Shared/AudioPlayer';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import LWPButton from '../Button/LWPButton';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import AudioPermissionModal from './AudioPermissionModal';
import Timer from './Timer';

const getS3PresignedUploadUrl = gql`
    mutation getS3PresignedUploadUrl {
        presignedUrlForFeedbackMedia(fileName: "readinglog", mediaType: AUDIO, feedbackType: READING) {
            token
            url
        }
    }
`;

const getParametersForLoginPage = gql`
    query getParameters($keys: [String!]!) {
        getParameters(keys: $keys) {
            key
            value
        }
    }
`;

const CommonAudioRecorder = ({
    callback,
    onClose,
    src,
    isShowCancelIcon = true,
    helperText,
    abort,
    onSaveStart = () => {},
    onSaveEnd = () => {}
}) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [recorder, setRecorder] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [timeoutId, setTimeoutId] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploadUrlMutation] = useMutation(getS3PresignedUploadUrl);

    const { loading, data } = useQuery(getParametersForLoginPage, {
        variables: { keys: ['SET_AUDIO_LIMIT'] }
    });

    const handleClose = () => {
        setAnchorEl(null);
    };

    const onStart = async (event) => {
        handleClose();
        const currentTarget = anchorEl ? anchorEl : event.currentTarget;
        const limitTime = data?.getParameters?.[0]?.value ?? 300;

        try {
            const record = await recordAudioToMp3();

            record?.start();
            setRecorder(record);
            setIsRecording(true);

            // Clear any existing timeouts to avoid multiple triggers
            if (timeoutId) clearTimeout(timeoutId);

            // Set a timeout to stop recording after 5 seconds and store the timeout ID
            const newTimeoutId = setTimeout(() => {
                onStop(record);
            }, limitTime * 1000);

            setTimeoutId(newTimeoutId);
        } catch (err) {
            console.log(err.message);
            setAnchorEl(anchorEl ? null : currentTarget);
            setIsRecording(false);
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                setTimeoutId(null);
            }
        };
    }, [timeoutId]);

    const onStop = async (recorder) => {
        setIsRecording(false);
        // Clear the timeout when recording is stopped manually
        if (timeoutId) clearTimeout(timeoutId);

        const audio = await recorder?.stop();

        if (audio) {
            setSaving(true);
            onSaveStart();
            await uploadUrlMutation().then(
                ({
                    data: {
                        presignedUrlForFeedbackMedia: { url, token }
                    }
                }) => {
                    fetch(url, {
                        method: 'PUT',
                        body: audio.audioBlob,
                        signal: abort?.signal
                    })
                        .then(async () => {
                            Object.defineProperty(audio, 'token', {
                                value: token
                            });
                            await callback(audio);
                        })
                        .catch((e) => {
                            console.log(e);
                            if (e?.name !== 'AbortError') {
                                window.newrelic?.noticeError(e, { caught: true, handled: false, in: 'CommonAudioRecorder' });
                                callSnackbar('Failed to upload audio!', 'error');
                            }
                        })
                        .finally(() => {
                            setSaving(false);
                            onSaveEnd();
                        });
                }
            );
        }
    };

    return (
        <>
            <div className="cancel-voice">{src && isShowCancelIcon && <CommonIconButton onClick={onClose} icon="clear" />}</div>
            <div className="recoder-img-conatiner MuiDropzoneArea-root">
                {!src && !loading && (
                    <>
                        <Timer isRecording={isRecording} limitTime={data?.getParameters?.[0]?.value ?? 300} />

                        <AudioPermissionModal
                            anchorEl={anchorEl}
                            setAnchorEl={setAnchorEl}
                            popoverClassName="audio_recorder_popover"
                            element={
                                <LWPButton
                                    onClick={(event) => (isRecording ? onStop(recorder) : onStart(event))}
                                    btnText={saving ? 'Saving...' : isRecording ? 'Stop recording' : 'Record audio'}
                                    disabled={anchorEl || loading || saving}
                                    loading={saving}
                                    color="primary"
                                />
                            }>
                            <div className="microphone_permission">
                                <Heading3 text="Microphone permission not granted" />
                                <Paragraph text="We need microphone permission to record your audio. Please try to enable permissions using the button below, or if this does not work, check your browser settings." />
                                <br />

                                {navigator &&
                                navigator.userAgent &&
                                navigator.userAgent.includes('Safari') &&
                                !navigator.userAgent.includes('Chrome') ? (
                                    <LWPButton btnText={'Try again'} color="primary" onClick={onStart} />
                                ) : (
                                    <LWPButton btnText={'Try again'} color="primary" onClick={handleClose} />
                                )}
                            </div>
                        </AudioPermissionModal>
                    </>
                )}
                {src && <AudioPlayer variant={isShowCancelIcon ? 'native' : 'rich'} src={src} hide />}
            </div>
            {helperText ? (
                <FormHelperText id="component-error-text" style={{ width: '100%' }}>
                    <Paragraph>{helperText}</Paragraph>
                </FormHelperText>
            ) : null}
        </>
    );
};

CommonAudioRecorder.propTypes = {
    callback: PropTypes.func,
    src: PropTypes.string,
    helperText: PropTypes.string,
    onClose: PropTypes.func,
    isShowCancelIcon: PropTypes.bool,
    abort: PropTypes.instanceOf(AbortController),
    onSaveStart: PropTypes.func,
    onSaveEnd: PropTypes.func
};

export default CommonAudioRecorder;
