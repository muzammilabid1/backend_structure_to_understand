/* eslint-disable @next/next/no-img-element */

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

interface NotActiveThisYearBannerProps {
    className?: string;
    title: string;
    description: string;
}

const NotActiveThisYearBanner = ({
    className = '',
    title = 'You’re too quick',
    description = 'Your school hasn’t launched the Learning with Parents programme yet this year! Please come back again later.'
}: NotActiveThisYearBannerProps) => (
    <div className={`not-active-this-year-banner ${className}`}>
        <img
            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
            alt="MathsCot Thinking"
        />
        <div className="message-content">
            <Heading1 text={title} />
            <Paragraph text={description} />
        </div>
    </div>
);

export default NotActiveThisYearBanner;
