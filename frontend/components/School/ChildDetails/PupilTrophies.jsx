import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React from 'react';

import PupilTrophies from './../../Shared/PupilTrophies';

const PupilTrophiesDetails = ({ isTeacherView }) => {
    const queryParams = useParams();

    return <PupilTrophies pupilId={queryParams?.pupil_id} isTeacherView={isTeacherView} />;
};

PupilTrophiesDetails.propTypes = {
    isTeacherView: PropTypes.bool
};

export default PupilTrophiesDetails;
