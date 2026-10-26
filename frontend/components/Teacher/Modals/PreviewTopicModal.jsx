import { useLazyQuery, useQuery } from '@apollo/client';
import { usePathname } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useCallback, useContext, useEffect, useState } from 'react';

import { getActivity, getTopic } from '../../../graphQl/queries';
import { getActivityComponentName, getTopicType, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonActivityPreview from './../../Shared/CommonActivityPreview';
import CommonTopicPreview from './../../Shared/CommonTopicPreview';
import DialogWrapper from './../../Shared/DialogWrapper';
import RenderStaticActivies from './../../Shared/StaticActivityViews/RenderStaticActivies';

const PreviewTopicModal = ({ open, setOpen, topicId, readOnly, selectTopicOnClick }) => {
    const [viewActivity, setViewActivity] = useState(null);
    // Stable reference required — inline arrow would cause the auto-watch useEffect in CommonTopicPreview to fire on every render
    const noop = useCallback(() => {}, []);

    const { callSnackbar } = useContext(ThemeContext);
    const pathname = usePathname();

    const { error: getTopicError, data: topic } = useQuery(getTopic, {
        variables: { id: topicId }
    });

    const [getActivityQuery, { error: pupilActivityError, data: activity }] = useLazyQuery(getActivity);

    useEffect(() => {
        pupilActivityError?.message && callSnackbar(pupilActivityError, 'error');
    }, [pupilActivityError]);

    useEffect(() => {
        getTopicError?.message && callSnackbar(getTopicError, 'error');
    }, [getTopicError]);

    useEffect(() => {
        if (viewActivity) {
            getActivityQuery({
                variables: { id: viewActivity }
            });
        }
    }, [viewActivity]);

    const isSelectAllow = () => pathname === '/class/[class_id]/schedule';

    return (
        <DialogWrapper
            className="view-topic-container-modal"
            open={open}
            setOpen={setOpen}
            filterBtn={isSelectAllow() ? !viewActivity && 'Select this topic' : null}
            filterBtnColor="primary"
            primaryBtnText={isSelectAllow() ? !viewActivity && 'Select this topic' : null}
            primaryBtnHandler={selectTopicOnClick}
            filterBtnHandler={selectTopicOnClick}
            secondaryBtn={viewActivity ? 'Back to topic' : 'Dismiss preview'}
            contentWidth="1248px"
            dialogFooter
            secondaryBtnHandler={viewActivity ? () => setViewActivity(null) : setOpen}
            subHeading={
                <LWPButton
                    size={'large'}
                    variant="contained"
                    btnText={viewActivity ? 'Back to topic' : 'Dismiss preview'}
                    onClick={viewActivity ? () => setViewActivity(null) : setOpen}
                    color="inherit"
                    customClass="p-0"
                />
            }>
            {viewActivity ? (
                activity?.activity?.activityType === 'STATIC' ? (
                    <RenderStaticActivies
                        activityComponentName={getActivityComponentName(activity?.activity?.details)}
                        type={getTopicType(activity?.activity?.topic?.isReading)}
                        readOnly={true}
                        pupilName={'Child name'}
                    />
                ) : (
                    <CommonActivityPreview activity={activity?.activity} readOnly={true} />
                )
            ) : (
                <CommonTopicPreview setViewActivity={setViewActivity} readOnly={readOnly} topic={topic?.topic} watchedTopicVideo={noop} />
            )}
        </DialogWrapper>
    );
};

PreviewTopicModal.propTypes = {
    topicId: PropTypes.string.isRequired,
    setOpen: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    selectTopicOnClick: PropTypes.func
};
PreviewTopicModal.defaultProps = {
    topicId: '',
    setOpen: () => {},
    open: false
};

export default PreviewTopicModal;
