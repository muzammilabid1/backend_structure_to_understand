/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import FieldCardOptions from '../../Shared/FieldCardOptions';

const ReadingLogForTeacher = ({ values, handleChange, handleBlur, setFileName, setSavingLock }) => {
    const [isFieldShow, setIsFieldShow] = useState([]);

    useEffect(() => {
        if (values) {
            if (values?.comments) {
                setIsFieldShow((prevState) => [...prevState, 'comment']);
            }

            if (values?.note) {
                setIsFieldShow((prevState) => [...prevState, 'note']);
            }

            if (values?.audioFile?.length || values.audioFile.audioUrl) {
                setIsFieldShow((prevState) => [...prevState, 'audio']);
            }

            return () => {
                setIsFieldShow([]);
            };
        } else {
            setIsFieldShow([]);
        }
    }, [values?.readDate]);

    return (
        <div className="readinglog-for-parent-page">
            <div>
                <FieldCardOptions
                    variant="reading-log-teacher"
                    isFieldShow={isFieldShow}
                    setIsFieldShow={setIsFieldShow}
                    values={values}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                    setFileName={setFileName}
                    setSavingLock={setSavingLock}
                />
            </div>
        </div>
    );
};

ReadingLogForTeacher.propTypes = {
    values: PropTypes.string,
    handleChange: PropTypes.func,
    handleBlur: PropTypes.func,
    setFileName: PropTypes.func,
    selectedFeedback: PropTypes.object,
    setSavingLock: PropTypes.func
};

export default ReadingLogForTeacher;
