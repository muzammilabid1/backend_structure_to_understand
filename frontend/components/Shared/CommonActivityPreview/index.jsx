import { Card } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { getTopicType } from '../../../shared/Services/handler';
import ActivityRationale from '../ActivityRationale';
import CommonActivityStepPreview from '../CommonActivityStepPreview';
import Heading1 from './../../Shared/Typography/Heading1';

const CommonActivityPreview = ({ readOnly, activity, pupilData, pupilActivityContext, isPupilActivity = false, sbtMediaByStepId }) => {
    return (
        <Card className={`activity-page-card top-${getTopicType(activity?.topic?.isReading)}-border`}>
            <Heading1 text={activity?.name} centerText customClass="main-heading" />
            <ActivityRationale
                activity={activity}
                increaseOpenCount={isPupilActivity}
                type={getTopicType(activity?.topic?.isReading)}
                pupilActivityContext={pupilActivityContext}
                readOnly={readOnly}
            />
            <CommonActivityStepPreview
                steps={activity?.steps?.legacySteps}
                subject={activity?.topic?.isReading}
                increaseModalOpenCount={isPupilActivity}
                pupilData={pupilData}
                pupilActivityContext={pupilActivityContext}
                readOnly={readOnly}
                sbtMediaByStepId={sbtMediaByStepId}
            />
        </Card>
    );
};

CommonActivityPreview.propTypes = {
    readOnly: PropTypes.bool,
    isPupilActivity: PropTypes.bool,
    activity: PropTypes.object,
    pupilData: PropTypes.object,
    pupilActivityContext: PropTypes.string,
    sbtMediaByStepId: PropTypes.object
};

export default CommonActivityPreview;
