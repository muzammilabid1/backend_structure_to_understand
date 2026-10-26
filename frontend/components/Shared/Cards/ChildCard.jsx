/* eslint-disable @next/next/no-img-element */
import { Card, CardActions, CardMedia, Grid } from '@mui/material';
import { usePathname } from 'next/navigation';
import PropTypes from 'prop-types';
import React from 'react';

import { DEFAULT_EMPTY_IMAGE, DEFAULT_READING_IMAGE, MINIO_PUBLIC_PATHS, READING, SCRAPBOOK } from '../../../shared/Constant';
import { useVimeoThumbnail } from '../../../shared/hooks/useVimeoThumbnail';
import { getCardBackgroundImageName } from '../../../shared/Services/handler';
import RatingStar from '../../Parent/RatingStar';
import RatingCheck from '../../Shared/RatingCheck';
import Heading1 from '../../Shared/Typography/Heading1';
import ChildCardFooter from './ChildCardFooter';

const ChildCard = ({
    childImg,
    childName,
    customClass,
    className,
    imageContainerClass,
    editIcon,
    editHandler,
    popup,
    activeBorder,
    activeTopBorder,
    activeLeftBorder,
    dateText,
    taskText,
    cardHandler,
    heading,
    ratingStar,
    starValue,
    setStarValue,
    stars,
    type,
    readOnly,
    sideStar,
    sideLayout,
    readingTarget,
    xs,
    sm,
    check,
    md,
    lg,
    tv,
    starPosition,
    watchedVideo,
    silverStars,
    earnedGoldStar,
    activities,
    dataTest,
    videoLink,
    isActivityCompleted = false
}) => {
    const pathname = usePathname();
    // A topic with no uploaded image falls back to its Vimeo thumbnail
    const vimeoThumbnail = useVimeoThumbnail(childImg || type === READING || type === SCRAPBOOK ? null : videoLink);
    const image = childImg || vimeoThumbnail;

    return (
        <Grid item xs={xs} sm={sm} md={md} lg={lg} className={`grid-card ${popup ? 'popup' : ''} ${className}`}>
            <Card classes={{ root: `child-card-container ${customClass}` }} onClick={cardHandler} data-test={dataTest}>
                <CardMedia
                    classes={{
                        root: `${type}-bg child-card-bg`
                    }}
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${getCardBackgroundImageName(type)}.png`}>
                    {activeBorder ? <div className={`${type}-color active-border`} /> : ''}

                    <span
                        className={`${imageContainerClass} ${type === READING ? 'reading-card-container' : `not-reading-card-container`} ${
                            ratingStar ? 'rating-star' : sideStar || sideLayout ? 'side-rating-star' : ''
                        }`}>
                        {type === READING && readingTarget >= 0 ? (
                            <RatingCheck
                                target={readingTarget > 0 ? readingTarget : 0}
                                rating={earnedGoldStar ? silverStars + 1 : silverStars}
                                silverStars={silverStars}
                                earnedGoldStar={earnedGoldStar}
                            />
                        ) : ratingStar || sideStar ? (
                            <RatingStar
                                starPosition={starPosition}
                                watchedVideo={watchedVideo}
                                stars={stars}
                                value={starValue}
                                setValue={setStarValue}
                                customClass="round-rating-star"
                                readOnly={readOnly}
                                silverStars={silverStars}
                                earnedGoldStar={earnedGoldStar}
                                activities={activities}
                            />
                        ) : heading ? (
                            <Heading1 text={heading} customClass="child_card_heading" centerText />
                        ) : null}

                        {check && <span className={`material-icons check_icon`}>check</span>}

                        <div className={'child_common_card'}>
                            <div className={isActivityCompleted ? 'isBlur_child_common_card' : ''}>
                                {(pathname === '/child/[child_id]' || pathname === '/child/[child_id]topics') && tv && image ? (
                                    type === READING ? (
                                        <div className="card_reading_container">
                                            <img src={DEFAULT_READING_IMAGE} alt="thumbnail" className="child-image" />
                                        </div>
                                    ) : type === SCRAPBOOK ? (
                                        <div className="card_img_container">
                                            <img src={'/assets/orange-closed-book.png'} alt="thumbnail" className="child-image" />
                                        </div>
                                    ) : (
                                        <div className="card_img_container" style={{ backgroundImage: `url(${tv})` }}>
                                            <img
                                                src={
                                                    image ||
                                                    `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/time_line3.png`
                                                }
                                                alt="thumbnail"
                                                className="child_image"
                                            />
                                        </div>
                                    )
                                ) : (
                                    <img
                                        src={
                                            type === READING
                                                ? DEFAULT_READING_IMAGE
                                                : type === SCRAPBOOK
                                                  ? '/assets/orange-closed-book.png'
                                                  : image || DEFAULT_EMPTY_IMAGE
                                        }
                                        alt="thumbnail"
                                        className="child-image"
                                    />
                                )}
                            </div>
                            {isActivityCompleted && (
                                <div className="child_card_on_complete">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/complete-activity-tick.svg`}
                                        alt="complete-image"
                                    />
                                </div>
                            )}
                        </div>
                    </span>

                    {editIcon ? (
                        <div className="edit-icon-container" onClick={(e) => e.stopPropagation()}>
                            <span className="material-icons edit-icon" onClick={editHandler}>
                                create
                            </span>
                        </div>
                    ) : (
                        ''
                    )}
                </CardMedia>
                <CardActions classes={{ root: 'child-card-name-section' }}>
                    <ChildCardFooter
                        primaryText={childName}
                        activeLeftBorder={activeLeftBorder}
                        activeTopBorder={activeTopBorder}
                        dateText={dateText}
                        taskText={taskText}
                    />
                </CardActions>
            </Card>
        </Grid>
    );
};

ChildCard.propTypes = {
    childImg: PropTypes.string,
    childName: PropTypes.string.isRequired,
    customClass: PropTypes.string,
    editIcon: PropTypes.bool,
    editHandler: PropTypes.func,
    activeLeftBorder: PropTypes.bool,
    activeTopBorder: PropTypes.bool,
    dateText: PropTypes.string,
    taskText: PropTypes.string,
    popup: PropTypes.bool,
    activeBorder: PropTypes.bool,
    borderColor: PropTypes.string,
    cardHandler: PropTypes.func,
    ratingStar: PropTypes.bool,
    starValue: PropTypes.number,
    setStarValue: PropTypes.func,
    readOnly: PropTypes.bool,
    type: PropTypes.string,
    stars: PropTypes.number,
    starPosition: PropTypes.number,
    readingTarget: PropTypes.number,
    sideStar: PropTypes.bool,
    sideLayout: PropTypes.bool,
    xs: PropTypes.number,
    sm: PropTypes.number,
    md: PropTypes.number,
    lg: PropTypes.number,
    className: PropTypes.string,
    imageContainerClass: PropTypes.string,
    heading: PropTypes.string,
    tv: PropTypes.string,
    check: PropTypes.bool,
    watchedVideo: PropTypes.bool,
    earnedGoldStar: PropTypes.bool,
    silverStars: PropTypes.number,
    activities: PropTypes.array,
    isActivityCompleted: PropTypes.bool,
    dataTest: PropTypes.string,
    videoLink: PropTypes.string
};

ChildCard.defaultProps = {
    // childImg: DEFAULT_CHILD_IMAGE,
    childName: 'Child Name',
    type: 'general',
    stars: 3,
    xs: 12,
    sm: 6,
    md: 6,
    lg: 4,
    watchedVideo: false
};

export default ChildCard;
