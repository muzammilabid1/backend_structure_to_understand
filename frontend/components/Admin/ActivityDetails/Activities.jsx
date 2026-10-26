import PropTypes from 'prop-types';
import React, { useState } from 'react';

import LWPButton from './../../Shared/Button/LWPButton';
import CommonCard from './../../Shared/Cards/CommonCard';
import UploadFile from './../../Shared/CommonFileUpload';
import InputField from './../../Shared/InputField/InputField';
import Heading1 from './../../Shared/Typography/Heading1';
import Heading3 from './../../Shared/Typography/Heading3';

const Activities = () =>
    // { open, setOpen, setActivityName }
    {
        const [activityType, setActivityType] = useState('File');
        const activityTypes = ['File', 'Text', 'Image', 'Link', 'Download'];

        const getCardBody = (bodyType) => {
            switch (bodyType) {
                case 'File':
                    return (
                        <div className="file_upload_container">
                            <UploadFile heading="File" icon="source" btnTitle="Upload file" />;
                        </div>
                    );

                case 'Text':
                    return (
                        <InputField
                            onChange={() => {}}
                            name="content"
                            customClass="w-100"
                            value={''}
                            multiline
                            rows={3}
                            lg={12}
                            md={12}
                            label="content"
                            onBlur={() => {}}
                        />
                    );

                case 'Image':
                    return (
                        <div className="thumbnail_image_container">
                            <UploadFile heading="Image" />
                        </div>
                    );

                case 'Link':
                    return <InputField label="Link" md={12} lg={12} name="link" value={''} onChange={() => {}} onBlur={() => {}} />;

                case 'Download':
                    return <UploadFile heading="Image" mainIcon="file_download" btnTitle="Upload file" />;

                default:
                    return null;
            }
        };

        return (
            <div className="activity_outline">
                <CommonCard>
                    <Heading1>Activity Name</Heading1>

                    {/* <hr className="w-100" /> */}

                    <div className="body_container">
                        <div>
                            <div className="card_body">{getCardBody(activityType)}</div>

                            <div>icon section</div>
                        </div>
                    </div>
                </CommonCard>

                <div className="body_container">
                    <Heading3 text="Add another step" />

                    <div className="nested_container">
                        {activityTypes.map((type) => (
                            <LWPButton key={type} btnText={type} onClick={() => setActivityType(type)} />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

Activities.propTypes = { setOpen: PropTypes.func, open: PropTypes.bool, setActivityName: PropTypes.func };

export default Activities;
