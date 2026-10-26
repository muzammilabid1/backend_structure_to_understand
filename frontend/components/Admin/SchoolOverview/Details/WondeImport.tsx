/* eslint-disable @typescript-eslint/no-explicit-any */
import { Form, Formik } from 'formik';
import { ImportStatus } from 'lwp-shared';
import { useContext } from 'react';

import { showDate, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchool } from '../../../../types/entities/ILwpSchool';
import LWPButton from '../../../Shared/Button/LWPButton';
import InputField from '../../../Shared/InputField/InputField';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface WondeImportProps {
    misName: string;
    wondeSchoolId: string;
    setImportStatus: (status: ImportStatus) => ImportStatus;
    pullWondeSchoolDataMutation: (options: { variables: { lwpSchoolId: string; wondeSchoolId: string } }) => Promise<void>;
    schoolId: string;
    refetchSchoolStatus: any;
    getImportStatus: (status: ImportStatus, timestamp: string) => string;
    importStatus: ImportStatus;
    schoolData: {
        getSchool: ILwpSchool;
    };
    pullWondeSchoolDataLoading: boolean;
    setRemoveWondeIdConfirmation: (open: boolean) => void;
}

const WondeImport = ({
    misName,
    wondeSchoolId,
    setImportStatus,
    pullWondeSchoolDataMutation,
    schoolId,
    refetchSchoolStatus,
    getImportStatus,
    importStatus,
    schoolData,
    pullWondeSchoolDataLoading,
    setRemoveWondeIdConfirmation
}: WondeImportProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    // Field is blank and the school has a saved Wonde ID
    const canRemoveWondeId = (fieldValue: string) => misName !== 'CSV' && !fieldValue?.trim() && !!wondeSchoolId;

    return (
        <Formik
            initialValues={{
                wondeSchoolId: misName === 'CSV' ? '' : wondeSchoolId
            }}
            enableReinitialize
            // validationSchema={importWondeSchoolValidation}
            onSubmit={(values) => {
                setImportStatus(ImportStatus.IMPORTING_DATA);
                pullWondeSchoolDataMutation({
                    variables: {
                        lwpSchoolId: schoolId,
                        wondeSchoolId: values.wondeSchoolId
                    }
                })
                    .then(refetchSchoolStatus())
                    .catch((error) => {
                        refetchSchoolStatus()();
                        callSnackbar(error, 'error');
                    });
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                    <InputField
                        label="Wonde School ID"
                        md={10}
                        lg={10}
                        name="wondeSchoolId"
                        value={values.wondeSchoolId}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.wondeSchoolId}
                        touched={touched.wondeSchoolId}
                    />

                    {misName !== 'CSV' ? (
                        <Paragraph
                            customClass={'school-wonde-status'}
                            text={getImportStatus(
                                importStatus || schoolData?.getSchool?.importStatus,
                                schoolData?.getSchool?.lastImportedAt
                                    ? `: ${showDate({ date: schoolData?.getSchool?.lastImportedAt, time: true })}`
                                    : ''
                            )}
                        />
                    ) : null}

                    {canRemoveWondeId(values.wondeSchoolId) ? (
                        <LWPButton btnText={'Remove Wonde ID'} onClick={() => setRemoveWondeIdConfirmation(true)} />
                    ) : (
                        <LWPButton
                            btnText={schoolData?.['getSchool']?.misName !== null ? 'Full Wonde resync' : 'Import from Wonde'}
                            disabled={
                                importStatus === ImportStatus.IMPORTING_DATA ||
                                schoolData?.getSchool?.importStatus === ImportStatus.IMPORTING_DATA ||
                                schoolData?.['getSchool']?.enableAddClasses ||
                                misName === 'CSV'
                            }
                            onClick={handleSubmit}
                            loading={pullWondeSchoolDataLoading}
                        />
                    )}
                </Form>
            )}
        </Formik>
    );
};

export default WondeImport;
