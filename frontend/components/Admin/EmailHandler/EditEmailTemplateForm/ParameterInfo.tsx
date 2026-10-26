/* eslint-disable react/no-unescaped-entities */
import React from 'react';

import { notificationEmailParameters } from '../../../../shared/Constant';
import CommonCard from '../../../Shared/Cards/CommonCard';
import EmailTemplateButton from '../../../Shared/EmailTemplateButton';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface CodePreviewProps {
    type: string;
    preference?: 'sms' | 'email';
}

const ParameterInfo = ({ type, preference }: CodePreviewProps) => {
    const notificationParameters = notificationEmailParameters[type];

    return (
        <CommonCard background="#F5F5F5">
            <Paragraph>
                You can include parameters in any of the following fields by using one of the following words wrapped in
                "&#123;&#123;&#123;" and "&#125;&#125;&#125;". You can also use other features of the handlebars language.
                <br />
                <br />
                These parameters are always available - click to copy:
            </Paragraph>
            <br />

            <EmailTemplateButton list={notificationParameters?.always} preference={preference} />
            <br />

            {notificationParameters?.conditional?.length ? (
                <>
                    <Paragraph>These parameters are sometimes available and can be used conditionally:</Paragraph>
                    <br />

                    <EmailTemplateButton list={notificationParameters?.conditional} preference={preference} />
                </>
            ) : null}
        </CommonCard>
    );
};

export default ParameterInfo;
