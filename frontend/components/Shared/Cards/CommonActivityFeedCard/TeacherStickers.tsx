/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation, useQuery } from '@apollo/client';
import { CircularProgress, Grid, useMediaQuery, useTheme } from '@mui/material';
import { Formik } from 'formik';
import { FeatureTooltipTargets } from 'lwp-shared';
import React, { useContext, useState } from 'react';
import Carousel from 'react-material-ui-carousel';

import { getStickersForTeacherForFeedbackReply } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { ThemeContext } from '../../../../shared/Services/handler';
import CommonPopOver from '../../CommonPopOver';
import Heading1 from '../../Typography/Heading1';

const createFeedbackReply = gql`
    mutation createFeedbackReply($input: CreateFeedbackReplyInput!) {
        createFeedbackReply(input: $input) {
            id
            logCreatedAt
            logUpdatedAt
            type
            sticker {
                id
                alt
                imageUrl
            }
            logCreatedBy {
                id
                nameForChildren
            }
        }
    }
`;

interface TeacherReplyProps {
    feedback: Record<string, any>;
    getFirstStickers: Record<string, any>;
    schoolId: string;
    setFeeds: (feeds: any) => void;
    setIsOpen: (isOpen: any) => void;
    hoverDescription: string;
}

const TeacherStickers = ({ setFeeds, feedback, getFirstStickers, hoverDescription, schoolId }: TeacherReplyProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);

    const { loading: getStickersForTeacherLoading, data } = useQuery(getStickersForTeacherForFeedbackReply, {
        variables: { schoolId }
    });

    const [createFeedbackReplyMutation] = useMutation(createFeedbackReply);

    const reviews = data?.getStickersForTeacher;

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    const chunkSize = isTablet ? (isMobile ? 1 : 2) : 3;

    const groupIntoChunks = (array, chunkSize) => {
        const output = [];
        let currentChunk = [];

        array.forEach((item, index) => {
            currentChunk.push(item);

            if ((index + 1) % chunkSize === 0 || index === array.length - 1) {
                output.push(currentChunk);
                currentChunk = [];
            }
        });

        return output;
    };

    return (
        <Formik
            initialValues={{ sticker: '', isOpen: true }}
            enableReinitialize
            onSubmit={async (values, { resetForm, setFieldValue }) => {
                try {
                    setFieldValue('isOpen', false);
                    const { data } = await createFeedbackReplyMutation({
                        variables: {
                            input: {
                                feedbackId: feedback?.id,
                                stickerId: values?.sticker
                            }
                        }
                    });

                    setFeeds((prev) => {
                        return prev.map((feed) => {
                            if (feed?.id === feedback?.id) {
                                const feedbackReplies = feed?.feedbackReplies;

                                return {
                                    ...feed,
                                    feedbackReplies: [...feedbackReplies, data?.createFeedbackReply]
                                };
                            }

                            return feed;
                        });
                    });
                    resetForm();
                    setFieldValue('isOpen', true);
                } catch (err) {
                    callSnackbar(err, 'error');
                }
            }}>
            {({ values, handleSubmit, setFieldValue }) => {
                return (
                    <Grid>
                        <CommonPopOver
                            closeOnClick={false}
                            isOpen={values?.isOpen}
                            anchorOriginVertical="top"
                            transformOriginVertical="bottom"
                            arrow
                            element={
                                <Grid>
                                    <CommonPopOver
                                        hover
                                        isOpen={isOpen}
                                        setIsOpen={setIsOpen}
                                        element={
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/sticker_icon_feed.svg`}
                                                alt={`Sticker`}
                                                id={
                                                    getFirstStickers?.id === feedback?.id
                                                        ? FeatureTooltipTargets.AWARD_STICKERS_TO_FEEDBACK
                                                        : `${feedback?.id}-sticker`
                                                }
                                                className="stickers-icon"
                                                onClick={() => setIsOpen(false)}
                                            />
                                        }>
                                        {hoverDescription}
                                    </CommonPopOver>
                                </Grid>
                            }>
                            <Grid height={196}>
                                {getStickersForTeacherLoading ? (
                                    <Grid display={'flex'} justifyContent={'center'} alignItems={'center'} height="inherit">
                                        <CircularProgress />
                                    </Grid>
                                ) : (
                                    <Grid className="stickers_container">
                                        <Heading1 text="Stickers" customClass="stickers_heading" />
                                        {reviews?.length > 0 ? (
                                            <Carousel
                                                animation="slide"
                                                autoPlay={false}
                                                navButtonsAlwaysVisible
                                                navButtonsWrapperProps={{ className: 'custom_wrapper_buttons' }}
                                                navButtonsProps={{
                                                    className: 'custom_button'
                                                }}
                                                NextIcon={<span className="material-icons">navigate_next</span>}
                                                PrevIcon={<span className="material-icons">navigate_before</span>}>
                                                {groupIntoChunks(reviews, chunkSize).map((group, groupIndex) => (
                                                    <Grid
                                                        container
                                                        key={groupIndex}
                                                        sx={{
                                                            gap: '20px',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            width: '300px',
                                                            margin: '0 auto'
                                                        }}>
                                                        {group.map((sticker, reviewIndex) => (
                                                            <Grid
                                                                item
                                                                key={reviewIndex}
                                                                xl
                                                                lg
                                                                md
                                                                sm
                                                                xs
                                                                sx={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    justifyContent: 'space-between',
                                                                    width: '100px'
                                                                }}>
                                                                <img
                                                                    src={sticker?.imageUrl}
                                                                    alt={sticker?.alt}
                                                                    width={'100%'}
                                                                    height={'116px'}
                                                                    className={`sticker-image ${sticker?.alt}`}
                                                                    onClick={() => {
                                                                        setFieldValue('sticker', sticker?.id);
                                                                        handleSubmit();
                                                                    }}
                                                                />
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                ))}
                                            </Carousel>
                                        ) : (
                                            'nothing to show here'
                                        )}
                                    </Grid>
                                )}
                            </Grid>
                        </CommonPopOver>
                    </Grid>
                );
            }}
        </Formik>
    );
};

export default TeacherStickers;
