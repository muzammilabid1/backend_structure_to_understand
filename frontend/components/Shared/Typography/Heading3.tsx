import React, { CSSProperties } from 'react';

interface Heading3Props {
    text: string;
    customClass?: string;
    style?: CSSProperties;
    onClick?: () => void;
    children?: React.ReactNode;
    dataTest?: string;
}

const Heading3 = ({ text, customClass = '', children, style, onClick, dataTest }: Heading3Props) => (
    <h3 style={style} className={`heading-three typography-text ${customClass}`} onClick={onClick} data-test={dataTest}>
        {text}
        {children}
    </h3>
);

export default Heading3;
