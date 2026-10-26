import { useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { getAllYearGroups } from '../../../../graphQl/queries';
import sharedJson from '../../../../shared/json/index.json';
import { ThemeContext } from '../../../../shared/Services/handler';
import HeadCardSection from '../HeadCardSection';
import CommonSelectField from './../../../Shared/CommonSelectField';
import ClassesSignupBarChart from './ClassesSignupBarChart';
import ClassesSignupColumnChart from './ClassesSignupColumnChart';
import ClassesSignupLineChart from './ClassesSignupLineChart';
import SignUpsPieChart from './SignUpsPieChart';
import TopicsCompletedBarChart from './TopicsCompletedBarChart';
import TopicsCompletedPieChart from './TopicsCompletedPieChart';
import TopicsCompletedStackedColumnChart from './TopicsCompletedStackedColumnChart';

const SchoolStatistics = ({ schoolId }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [statistics, setStatistics] = useState(1);
    const [year, setYear] = useState(1);
    const [period, setPeriod] = useState(1);

    const { error, data: yearGroups } = useQuery(getAllYearGroups);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    return (
        <div className="school-statistics">
            <Grid container className="school-statistics-grid" spacing={1}>
                <CommonSelectField
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                    value={statistics}
                    label="Subject"
                    options={sharedJson?.statisticsOptions}
                    onChange={(e) => setStatistics(e.target.value)}
                />

                <CommonSelectField
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                    label="Year group"
                    value={year}
                    options={(yearGroups?.allYearGroup || []).map((item) => ({ value: item.year, key: item.id }))}
                    onChange={(e) => setYear(e.target.value)}
                />

                <CommonSelectField
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                    value={period}
                    label="Period"
                    onChange={(e) => setPeriod(e.target.value)}
                    options={sharedJson?.periodOptions}
                />
            </Grid>

            {statistics === 1 ? (
                <>
                    <SignUpsPieChart heading="Parents signed up" schoolId={schoolId} />
                    <ClassesSignupColumnChart title="Total signups across classes" schoolId={schoolId} />
                    <ClassesSignupLineChart title="Total signups across the year" schoolId={schoolId} />
                    <ClassesSignupBarChart title="Total signups across classes per year group compared with average" schoolId={schoolId} />
                </>
            ) : statistics === 2 ? (
                <>
                    <TopicsCompletedPieChart heading="Topics completed" schoolId={schoolId} />
                    <TopicsCompletedStackedColumnChart title="Total topics completed across classes" schoolId={schoolId} />
                    <TopicsCompletedBarChart title="Total topics completed compared to national average" schoolId={schoolId} />
                </>
            ) : (
                <>
                    <HeadCardSection schoolId={schoolId} />
                    <SignUpsPieChart heading="Total signups across school" schoolId={schoolId} />
                    <TopicsCompletedPieChart heading="Total topics completed across school" schoolId={schoolId} />
                </>
            )}
        </div>
    );
};

SchoolStatistics.propTypes = { schoolId: PropTypes.number };

export default SchoolStatistics;
