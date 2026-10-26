import React, { CSSProperties, useEffect, useRef, useState } from 'react';

interface ParagraphProps {
    text?: string | number | React.ReactNode;
    customClass?: string;
    dataTest?: string;
    centerText?: boolean;
    children?: React.ReactNode;
    onClick?: () => void;
    style?: CSSProperties;
    isTruncate?: boolean;
    dontCapitilizeFirstLetter?: boolean;
    id?: string;
}

const Paragraph = ({
    text = '',
    centerText,
    customClass,
    onClick,
    style,
    children,
    dataTest,
    isTruncate = false,
    id,
    dontCapitilizeFirstLetter = false
}: ParagraphProps) => {
    const [showTitle, setShowTitle] = useState(false);
    const paragraphRef = useRef(null);

    useEffect(() => {
        if (isTruncate && paragraphRef.current) {
            const containerWidth = paragraphRef.current.clientWidth;
            const textWidth = paragraphRef.current.scrollWidth;

            if (textWidth > containerWidth) {
                setShowTitle(true);
            } else {
                setShowTitle(false);
            }
        }
    }, [text, isTruncate]);

    return (
        <p
            style={style}
            id={id}
            ref={paragraphRef}
            onClick={onClick}
            title={showTitle ? (typeof text === 'string' ? text : '') : ''}
            className={`paragraph typography-text ${centerText ? 'center-text' : ''} ${dontCapitilizeFirstLetter ? 'lowercase-first-letter-paragraph' : ''} ${customClass ? customClass : ''} ${
                isTruncate ? 'truncate' : ''
            } `}
            data-test={dataTest}>
            {text}
            {children}
        </p>
    );
};

export default Paragraph;
