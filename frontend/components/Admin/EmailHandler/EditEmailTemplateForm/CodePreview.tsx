/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button, ButtonGroup } from '@mui/material';
import React, { useState } from 'react';

import CommonCard from '../../../Shared/Cards/CommonCard';

interface CodePreviewProps {
    noSms?: boolean;
    preview?: boolean;
    name?: string;
    value?: string;
    setFieldValue?: (field: string, value: any, shouldValidate?: boolean) => void;
    emailTemplatePreviewData: string;
}

const CodePreview = ({ noSms = false, preview = false, name, setFieldValue, emailTemplatePreviewData = '' }: CodePreviewProps) => {
    const [selet, setSelet] = useState('Desktop');

    const groupBtn = noSms ? ['Desktop', 'Mobile'] : ['Desktop', 'Mobile', 'SMS'];

    return (
        <div>
            <CommonCard background={preview ? '' : '#F5F5F5'}>
                <div className="Common_btn_group">
                    <ButtonGroup>
                        {groupBtn?.map((btn) => (
                            <Button
                                className={`${btn === selet ? 'btn_group_active' : 'btn_group_rest'} btn_group_type`}
                                onClick={() => {
                                    if (name) {
                                        setFieldValue(name, btn);
                                    }

                                    setSelet(btn);
                                }}>
                                {btn}
                            </Button>
                        ))}
                    </ButtonGroup>
                </div>

                <br />
                <br />
                <div style={{ margin: 'auto', width: preview ? (selet === 'Desktop' ? 1044 : 345) : selet === 'Desktop' ? 510 : 250 }}>
                    <iframe
                        title="Newsletter Subscription Form"
                        style={{
                            width: '100%',
                            height: preview ? '605px' : '300px', // Declare the 'height' variable here
                            border: '1px solid',
                            borderRadius: '10px'
                        }}
                        srcDoc={emailTemplatePreviewData}></iframe>
                </div>
            </CommonCard>
        </div>
    );
};

export default CodePreview;
