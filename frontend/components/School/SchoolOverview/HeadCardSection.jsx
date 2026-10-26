/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import { useContext } from 'react';

import { ADMIN, MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonCard from '../../Shared/Cards/CommonCard';
import Paragraph from '../../Shared/Typography/Paragraph';

const HeadCardSection = ({ schoolData }) => {
    const { userId, token } = useContext(ThemeContext);
    const router = useRouter();
    const { school_id } = router?.query || {};

    const isAdminOrSchoolLeader = token?.userType === ADMIN || token?.isSchoolLeader;
    const feedRoute = isAdminOrSchoolLeader && school_id ? `/school/${school_id}/feed` : `/feed/${userId}`;

    const cards = [
        {
            title: 'pupils active this term',
            count: schoolData?.pupilsActive,
            image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/pupils-active-this-term.png`
        },
        {
            title: 'stars earned',
            count: schoolData?.starsEarned,
            image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/stars-earned.png`
        },
        {
            title: 'comments, photos & audio',
            count: schoolData?.commentsAndPhotos,
            image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/comment-photos-audios.png`,
            routeText: (
                <div className="go-to-activity-feed" onClick={() => router?.push(feedRoute)}>
                    <Paragraph customClass="title" text="Go to activity feed" />
                    <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/right-arrow-icon.png`} />
                </div>
            )
        }
    ];

    return (
        <div className="head-card-section">
            <Grid container spacing={3}>
                {cards.map((card, key) => (
                    <CommonCard
                        key={key}
                        xs={12}
                        md={4}
                        lg={4}
                        cardClassName="school-overview-card-container"
                        cardContentClassName={`card_body ${key === 0 ? 'paddingTop-0' : ''} ${card.onClick ? 'cursor_pointer' : ''}`}>
                        <img className={`card-img ${card.title === 'stars earned' && 'second-card-img'}`} src={card.image} alt="..." />
                        <div style={{ width: '100%' }}>
                            <Paragraph customClass="count" text={card.count} />
                            <Paragraph customClass="title" text={card.title} />
                        </div>
                        {card.routeText}
                    </CommonCard>
                ))}
            </Grid>
        </div>
    );
};

HeadCardSection.propTypes = { schoolData: PropTypes.object };

export default HeadCardSection;
