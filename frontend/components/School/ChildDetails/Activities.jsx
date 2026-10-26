import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import AccordionList from './../../../components/Teacher/AccordionList';
import CommonStatus from './../../Shared/CommonStatus';

const Activities = ({ loading, pupilTopics, pupil }) => {
    let filterUnReadingTopic = pupilTopics?.filter((item) => !item?.topic?.isReading);

    return (
        <div className="mt10" data-test={'activities-section'}>
            {!loading && !pupilTopics ? (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={''}
                    heading={'No activities to show'}
                />
            ) : (
                <AccordionList topics={filterUnReadingTopic} pupil={pupil} />
            )}
        </div>
    );
};

Activities.propTypes = {
    loading: PropTypes.bool,
    pupilTopics: PropTypes.array,
    pupil: PropTypes.object
};

export default Activities;
