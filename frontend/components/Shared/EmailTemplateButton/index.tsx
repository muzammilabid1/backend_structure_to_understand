import React from 'react';

import LWPButton from '../Button/LWPButton';

interface EmailTemplateButtonProps {
    list: string[];
    preference: 'sms' | 'email';
}

const EmailTemplateButton = ({ list, preference }: EmailTemplateButtonProps) => {
    const copyText = (value: string) => {
        navigator.clipboard.writeText(`{{{${value}}}}`);
    };

    return (
        <div className="email_temp_btn">
            {list?.map((item, index) => {
                item = item === 'BASEURL' && preference === 'sms' ? 'SHORTBASEURL' : item;

                return (
                    <LWPButton
                        key={index}
                        color="inherit"
                        btnText={item.toUpperCase()}
                        endIcon="content_copy"
                        onClick={() => copyText(item.toUpperCase())}
                    />
                );
            })}
        </div>
    );
};

export default EmailTemplateButton;
