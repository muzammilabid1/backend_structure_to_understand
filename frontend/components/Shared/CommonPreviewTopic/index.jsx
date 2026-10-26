import { useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useCallback, useContext, useEffect } from 'react';

import { getTopicForPreview } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../CommonLoading';
import CommonTopicPreview from './../CommonTopicPreview';

const CommonPreviewTopic = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();
    const classTopicId = router?.query?.classTopicId || null;

    const {
        error: getTopicError,
        loading: topicLoading,
        data: topic
    } = useQuery(getTopicForPreview, { variables: { id: queryParams?.topic_id }, skip: !queryParams?.topic_id });

    useEffect(() => {
        getTopicError?.message && callSnackbar(getTopicError, 'error');
    }, [getTopicError]);

    // Stable reference required — inline arrow would cause the auto-watch useEffect in CommonTopicPreview to fire on every render
    const noop = useCallback(() => {}, []);

    if (topicLoading) return <CommonLoading />;

    return (
        <div className="view-topic-container">
            <CommonTopicPreview
                isPreview={true}
                readOnly={true}
                topic={topic?.getTopicForPreview}
                watchedTopicVideo={noop}
                classTopicId={classTopicId}
            />
        </div>
    );
};

export default CommonPreviewTopic;
