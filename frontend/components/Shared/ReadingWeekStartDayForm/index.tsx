import { Formik } from 'formik';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import React, { ChangeEvent, useContext, useState } from 'react';

import sharedJson from '../../../shared/json/index.json';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonSelectField from '../CommonSelectField';
import UpdateReadingWeekStartDayModal from '../Modals/UpdateReadingWeekStartDayModal';

export const ReadingWeekStartDayForm = ({ classId, currentReadingLaunchDate, schoolClassName, extraWarnings = false }: Props) => {
    const [readingWeekStartDayModalData, setReadingWeekStartDayModalData] = useState({ isOpen: false, newReadingWeekStartDay: null });
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    return (
        <Formik
            initialValues={{
                readingWeekStartDay: null != currentReadingLaunchDate ? moment(currentReadingLaunchDate).isoWeekday() : ''
            }}
            onSubmit={(values) => {
                setReadingWeekStartDayModalData({ isOpen: true, newReadingWeekStartDay: values.readingWeekStartDay });
            }}>
            {({ initialValues, values, setFieldValue, handleSubmit, resetForm }) => (
                <>
                    <form onSubmit={handleSubmit}>
                        <CommonSelectField
                            customClass={'mt-10'}
                            md={4}
                            lg={4}
                            label={'Select new reading week'}
                            options={sharedJson?.readingDays}
                            value={values.readingWeekStartDay}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                const value = parseInt(event.target.value);

                                // Sunday
                                setFieldValue('readingWeekStartDay', 0 === value ? 7 : value);
                            }}
                        />
                        <LWPButton
                            type={'submit'}
                            onClick={handleSubmit}
                            customClass="mb-10"
                            color={extraWarnings ? 'error' : undefined}
                            disabled={values.readingWeekStartDay === initialValues.readingWeekStartDay}
                            btnText={
                                extraWarnings
                                    ? `Restart the reading log to run ${sharedJson?.readingDays?.find((i) => i.key == values.readingWeekStartDay)?.value ?? 'invalid day'}`
                                    : 'Save'
                            }
                        />
                    </form>

                    {readingWeekStartDayModalData.isOpen && (
                        <UpdateReadingWeekStartDayModal
                            classId={classId}
                            schoolClassName={schoolClassName}
                            newReadingWeekStartDay={readingWeekStartDayModalData.newReadingWeekStartDay}
                            onSuccess={() => {
                                setReadingWeekStartDayModalData({ isOpen: false, newReadingWeekStartDay: null });
                                callSnackbar('Successfully changed reading start day!', 'success');
                                router.refresh();
                            }}
                            onCancel={() => {
                                setReadingWeekStartDayModalData({ isOpen: false, newReadingWeekStartDay: null });
                                resetForm();
                            }}
                        />
                    )}
                </>
            )}
        </Formik>
    );
};

interface Props {
    classId: number;
    currentReadingLaunchDate: string;
    schoolClassName?: string;
    extraWarnings?: boolean;
}
