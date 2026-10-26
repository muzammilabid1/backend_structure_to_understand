/* eslint-disable @next/next/no-img-element */
import { useQuery } from '@apollo/client';
import gql from 'graphql-tag';
// import CloseIcon from '@mui/icons-material/Close';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo } from 'react';

import { MINIO_PUBLIC_PATHS, PupilType } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import CommonCard from '../Shared/Cards/CommonCard';
import CommonLoading from '../Shared/CommonLoading';
import MathScoteWithTrophy from '../Shared/MathScoteWithTrophy';
import PupilTrophies from '../Shared/PupilTrophies';
import ReadMore from '../Shared/ReadMore';
import Paragraph from '../Shared/Typography/Paragraph';

// Queries

const getPupilTotalStarCount = gql`
    query getPupilTotalStarCount($pupilId: String!) {
        getPupilTotalStarCount(pupilId: $pupilId) {
            silverStars
            goldStars
        }
    }
`;

const MyAchievements = ({ images, pupil }) => {
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);

    const type = pupil?.pupil?.type;
    const isCurrentClass = !!pupil?.pupil?.currentClassOrGroupAcrossClasses;

    const {
        error: pupilTotalStarCountError,
        data: pupilTotalStarCount,
        loading: pupilTotalStarCountLoading
    } = useQuery(getPupilTotalStarCount, { variables: { pupilId: queryParams?.child_id } });

    useEffect(() => {
        pupilTotalStarCountError?.message && callSnackbar(pupilTotalStarCountError, 'error');
    }, [pupilTotalStarCountError]);

    const { message, slice, noMathscotTextVisible } = useMemo(() => {
        let message = '';
        let slice;
        let noMathscotTextVisible = false;

        const { isFullProgramme, isReadyTeddyEnabled } = pupil?.pupil?.currentClassOrGroupAcrossClasses ?? {};
        if (pupil?.pupil?.type === PupilType.BOTH) {
            /**
             * If the pupil is in a class with reading logs enabled, and one of the following applies:
             * - they're in the Full Programme,
             * - they're in a Ready Teddy class,
             * - or Money Skills is enabled at the school level *and* the class has scheduled Money Skills topics, and pupils contain topics
             *
             * then the pupil's type will be set to PupilType.BOTH.
             */
            message =
                'Log your reading or complete activities to collect stars! \n\n Earn a gold star by completing your first activity in a topic or hitting your weekly reading goal, and a silver star for watching the topic video and completing any additional activities, and each day you log your reading.';
            slice = 57;
        } else if (isFullProgramme) {
            message =
                'Complete activities to earn stars and unlock new items! \n\n You get a gold star for completing your first activity in a topic, and a silver star for watching the topic video and any additional activities you complete.';
            slice = 55;
            noMathscotTextVisible = true;
        } else if (isReadyTeddyEnabled) {
            message =
                'Complete activities to earn stars! \n\n You get a gold star for completing your first activity in a topic, and a silver star for watching the topic video and any additional activities you complete.';
            slice = 34;
        } else {
            message =
                'Log your reading to earn stars! \n\n You get a silver star every day that you log your reading, and a gold star for reaching your target for the week.';
            slice = 31;
        }

        return {
            message,
            slice,
            noMathscotTextVisible
        };
    }, [pupil?.pupil?.currentClassOrGroupAcrossClasses]);

    if (pupilTotalStarCountLoading) return <CommonLoading />;

    return (
        <div className="history_bar achivement_bar">
            <div className="nested_container">
                {isCurrentClass && (
                    <CommonCard className="nested_container_card">
                        {images[0]?.imgPath ? (
                            <MathScoteWithTrophy images={images} pupilHome />
                        ) : (
                            noMathscotTextVisible && (
                                <div className="no-mathscot-text">
                                    <Paragraph
                                        centerText
                                        text={"You don't currently have a mathscot. Complete your first activity to pick your mathscot."}
                                        dataTest="child-awards-page-no-mathscot-text"
                                    />
                                </div>
                            )
                        )}
                        <div className="nested_container_1">
                            <Paragraph centerText customClass="title">
                                I have earned
                            </Paragraph>
                            <span className="nested_sapn">
                                <Paragraph dataTest="child-awards-page-gold-star-count" customClass="title bold cus-gold">
                                    {pupilTotalStarCount?.getPupilTotalStarCount?.goldStars}
                                </Paragraph>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/gold_outlined_check_star.svg`}
                                    alt="star"
                                    width={65}
                                    height={65}
                                    className="middle-img"
                                />
                                <Paragraph dataTest="child-awards-page-silver-star-count" customClass="title bold cus-silver">
                                    {pupilTotalStarCount?.getPupilTotalStarCount?.silverStars}
                                </Paragraph>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/check_star.svg`}
                                    alt="star"
                                    width={40}
                                    height={40}
                                />
                            </span>

                            <p className="title awards_bar_text">this year!</p>
                        </div>

                        <br />
                        <div className="nested_container_readmore" data-test="child-awards-page-info-text">
                            <ReadMore text={message} slice={slice} showLess={false} />
                        </div>
                    </CommonCard>
                )}
                <PupilTrophies
                    pupilId={queryParams?.child_id}
                    parentId={queryParams?.parent_id}
                    type={type}
                    isCurrentClass={isCurrentClass}
                />
            </div>
        </div>
    );
};

MyAchievements.propTypes = { images: PropTypes.string, pupil: PropTypes.object };

export default MyAchievements;
