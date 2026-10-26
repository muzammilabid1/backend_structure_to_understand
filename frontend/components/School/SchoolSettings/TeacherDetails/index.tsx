import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import CommonListWithIcon from '../../../Shared/CommonListWithIcon';
import AddTeacherModal from '../../../Shared/Modals/AddTeacher';
import Heading1 from '../../../Shared/Typography/Heading1';
import SchoolSettingsWrapper from '../SchoolSettingsWrapper';
import AccordionList from './AccordionList';

const TeacherDetails = () => {
    const params = useParams();
    const schoolId = params?.school_id as string;

    const [open, setOpen] = useState(false);
    const [defaultValues, setDefaultValues] = useState(null);

    const addNewsListItem = [
        {
            text: 'Add a teacher',
            icon: 'add',
            iconRight: true,
            bold: true,
            dataTest: 'add-teacher-list',
            onClick: () => {
                setDefaultValues(null);
                setOpen(!open);
            }
        }
    ];

    return (
        <SchoolSettingsWrapper>
            <div data-test={'teacher-details-tab-section'} className="teacher-details-page">
                <div className="teacher-details-header">
                    <Heading1 text="Teachers" />
                    <CommonListWithIcon list={addNewsListItem} />
                </div>
                <AccordionList onClick={() => setOpen(!open)} setDefaultValues={setDefaultValues} schoolId={schoolId} />
                <AddTeacherModal open={open} setOpen={() => setOpen(!open)} defaultValues={defaultValues} schoolId={schoolId} />
            </div>
        </SchoolSettingsWrapper>
    );
};

TeacherDetails.propTypes = { schoolId: PropTypes.string };

export default TeacherDetails;
