import React from 'react';

interface Heading2Props {
    text: string;
    customClass?: string;
    centerText?: boolean;
    style?: React.CSSProperties;
    fontSize?: string;
    dataTest?: string;
}

const Heading2 = ({ text, customClass = '', centerText = false, style, fontSize, dataTest }: Heading2Props) => (
    <h2
        className={`heading-two typography-text ${customClass} ${centerText ? 'center-text' : ''}`}
        style={{ ...style, fontSize }}
        data-test={dataTest}>
        {text}
    </h2>
);

export default Heading2;
