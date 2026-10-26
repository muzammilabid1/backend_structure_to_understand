import React, { CSSProperties } from 'react';

interface Heading1Props {
    text?: string;
    customClass?: string;
    onClick?: () => void;
    centerText?: boolean;
    children?: React.ReactNode;
    style?: CSSProperties;
    dataTest?: string;
    id?: string;
}

const Heading1 = ({ text = '', customClass = '', centerText = false, children, style, onClick, dataTest, id = '' }: Heading1Props) => (
    <h1
        className={`heading-one typography-text ${customClass} ${centerText ? 'center-text' : ''}`}
        style={style}
        id={id}
        data-test={dataTest}
        onClick={onClick}>
        {text || children}
    </h1>
);

export default Heading1;
