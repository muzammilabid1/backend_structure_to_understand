import { gql, useMutation } from '@apollo/client';
import { Form, Formik } from 'formik';
import React, { useContext } from 'react';

import { adminReleasePupilTopics } from '../../../graphQl/mutations';
import { unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from './../../Shared/Button/LWPButton';
import DateField from './../../Shared/InputField/DateField';
import Heading2 from './../../Shared/Typography/Heading2';
import CronJobSelect from './CronJobsSelect';
import RunScheduledCronJob from './RunScheduledCronJob';

// Mutations

const syncSiteImages = gql`
    mutation syncSiteImages {
        syncSiteImages
    }
`;

const RunCronJobs = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [adminReleasePupilTopicsMutation, { loading: loading }] = useMutation(adminReleasePupilTopics);
    const [syncSiteImagesMutation, { loading: syncSiteImagesLoading }] = useMutation(syncSiteImages);

    return (
        <div className="cron-jobs-container" data-test={'run-tasks-page'}>
            <Heading2 text="Release Pupil Topics" />
            <Formik
                initialValues={{
                    date: new Date()
                }}
                enableReinitialize
                onSubmit={async (values) => {
                    try {
                        await adminReleasePupilTopicsMutation({
                            variables: {
                                date: values.date
                            }
                        })
                            .then(() => {
                                callSnackbar('Pupil topics released successfully!', 'success');
                            })
                            .catch(({ ...err }) => callSnackbar(err, 'error'));
                    } catch (error) {
                        const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                        if (statusCode) {
                            callSnackbar(error, 'error');
                        } else {
                            window.newrelic?.noticeError(error, { caught: true, handled: false });
                            callSnackbar(unexpectedError, 'error');
                        }
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors }) => (
                    <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                        <DateField
                            name="date"
                            id="date"
                            label="Before"
                            md={6}
                            lg={6}
                            value={values.date}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.date}
                        />

                        <LWPButton
                            customClass="release-pupil-topic-btn"
                            btnText={'Release topics'}
                            onClick={handleSubmit}
                            loading={loading}
                        />
                    </Form>
                )}
            </Formik>

            <CronJobSelect />

            <LWPButton
                btnText={'Sync site images'}
                loading={syncSiteImagesLoading}
                onClick={() => {
                    syncSiteImagesMutation()
                        .then(() => {
                            callSnackbar('Images sync successful!', 'success');
                        })
                        .catch(({ ...err }) => callSnackbar(err, 'error'));
                }}
            />
            <RunScheduledCronJob />
        </div>
    );
};

export default RunCronJobs;
