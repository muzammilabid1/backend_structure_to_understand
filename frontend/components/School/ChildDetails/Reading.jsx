import { useQuery } from '@apollo/client';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { getPupilReadingTopicsForPupilReadingTab } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from './../../Shared/CommonLoading';
import CommonReadingLog from './../../Shared/CommonReadingLog';

const Reading = ({ pupilId, pupil, classId }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const {
        loading,
        error: pupilReadingTopicsError,
        data: pupilReadingTopics
    } = useQuery(getPupilReadingTopicsForPupilReadingTab, { variables: { pupilId } });

    useEffect(() => {
        pupilReadingTopicsError?.message && callSnackbar(pupilReadingTopicsError, 'error');
    }, [pupilReadingTopicsError]);

    if (loading) return <CommonLoading />;

    return (
        <CommonReadingLog
            pupilReadingLogFeedbacks={pupilReadingTopics?.getPupilReadingTopics}
            pupil={pupil}
            classId={classId}
            type="pupil-detail"
        />
    );
};

Reading.propTypes = {
    pupilId: PropTypes.number.isRequired,
    pupil: PropTypes.object,
    classId: PropTypes.array
};

export default Reading;
