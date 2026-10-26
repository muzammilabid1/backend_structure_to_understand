import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { getActivity } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { getActivityComponentName, getTopicType, ThemeContext } from '../../../shared/Services/handler';
import CommonActivityPreview from './../../Shared/CommonActivityPreview';
import CommonLoading from './../../Shared/CommonLoading';
import MathScotWithBubbleText from './../../Shared/MathScotWithBubbleText';
import RenderStaticActivies from './../../Shared/StaticActivityViews/RenderStaticActivies';

const ActivityPreview = ({ isAdminView, setTopicId }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();

    const {
        loading: getActivityIsLoading,
        error: getActivityError,
        data: activity
    } = useQuery(getActivity, {
        variables: { id: queryParams?.activity_id }
    });

    useEffect(() => {
        if (activity) {
            setTopicId(activity?.activity?.topic?.id);
        }
    }, [activity]);

    useEffect(() => {
        getActivityError?.message && callSnackbar(getActivityError, 'error');
    }, [getActivityError]);

    if (getActivityIsLoading) return <CommonLoading />;

    return (
        <>
            <MathScotWithBubbleText
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/activity-child.png`}
                bubbleText={activity?.activity?.welcomeMessage}
            />
            {activity?.activity?.activityType === 'STATIC' ? (
                <RenderStaticActivies
                    activityComponentName={getActivityComponentName(activity?.activity?.details)}
                    type={getTopicType(activity?.activity?.topic?.isReading)}
                    readOnly={true}
                    isAdminView={isAdminView}
                />
            ) : (
                <CommonActivityPreview activity={activity?.activity} readOnly={true} />
            )}
        </>
    );
};

ActivityPreview.propTypes = { isAdminView: PropTypes.string, setTopicId: PropTypes.func };

ActivityPreview.defaultProps = {
    isAdminView: false
};

export default ActivityPreview;
