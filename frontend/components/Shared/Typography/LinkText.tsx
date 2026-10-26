/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';

type LinkTextProps = {
    onClick?: () => void;
    fontBold?: boolean;
    text?: string;
    route?: string;
    home?: boolean;
    target?: string;
    color?: string;
    customClass?: string;
};

const LinkText = ({ onClick, fontBold, text, route = '', home, target, color = '#000', customClass }: LinkTextProps) => (
    <Link
        passHref
        target={target}
        className={customClass}
        href={route}
        style={{ fontWeight: fontBold ? 'bold' : 'normal', color: color }}
        onClick={onClick}>
        {home ? (
            <img
                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/home.png`}
                alt="Home icon"
                className="svg-iocn"
            />
        ) : (
            ''
        )}
        {text}
    </Link>
);

export default LinkText;
