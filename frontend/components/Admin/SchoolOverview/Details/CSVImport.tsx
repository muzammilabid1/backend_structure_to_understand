import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { ImportStatus } from 'lwp-shared';

import { _getBase64ToFile, showDate } from '../../../../shared/Services/handler';
import { ILwpSchool } from '../../../../types/entities/ILwpSchool';
import LWPButton from '../../../Shared/Button/LWPButton';
import InputField from '../../../Shared/InputField/InputField';
import Paragraph from '../../../Shared/Typography/Paragraph';
import UploadFile from './../../../Shared/CommonFileUpload';

interface CSVImportProps {
    setCsvFile: (file: File) => void;
    setCsvColumns: (columns: string[]) => void;
    setCsvColumnMap: (map: boolean) => void;
    isCSVAndActive: boolean;
    wondeSchoolId: string;
    misName: string;
    schoolData: { getSchool: ILwpSchool };
    importSchoolDataLoading: boolean;
    getImportStatus: (status: ImportStatus | null, timestamp: string) => string;
    importStatus: ImportStatus | null;
}

const CSVImport = ({
    setCsvFile,
    setCsvColumns,
    setCsvColumnMap,
    isCSVAndActive,
    wondeSchoolId,
    misName,
    schoolData,
    importSchoolDataLoading,
    getImportStatus,
    importStatus
}: CSVImportProps) => {
    return (
        <Formik
            initialValues={{
                file: ''
            }}
            onSubmit={async (values) => {
                if (values?.file) {
                    const file = _getBase64ToFile(values.file, 'import.csv');

                    setCsvFile(file);
                    setCsvColumns(
                        (await file.text())
                            .split('\n')
                            .shift()
                            .split(',')
                            .map((col) => col.replace(/^"([^"]+)"$/, '$1'))
                    );
                    setCsvColumnMap(false);
                }
            }}>
            {({ values, handleChange, handleSubmit, touched }) => (
                <form>
                    {isCSVAndActive ? (
                        <Grid container mt={2}>
                            <InputField label="CSV School ID" md={3} lg={3} value={wondeSchoolId} disabled />

                            <Grid container>
                                <Paragraph
                                    customClass={'school-wonde-status'}
                                    text={getImportStatus(
                                        importStatus || schoolData?.getSchool?.importStatus,
                                        schoolData?.getSchool?.lastImportedAt
                                            ? `: ${showDate({ date: schoolData?.getSchool?.lastImportedAt, time: true })}`
                                            : ''
                                    )}
                                />
                            </Grid>
                        </Grid>
                    ) : null}

                    <UploadFile
                        heading=""
                        accept="text/csv"
                        touched={touched.file}
                        onClose={() => handleChange({ target: { name: 'file', value: null } })}
                        onSave={(file) => {
                            handleChange({ target: { name: 'file', value: file } });
                        }}
                    />

                    <LWPButton
                        btnText="Import CSV"
                        onClick={handleSubmit}
                        disabled={!values.file || (misName && schoolData?.['getSchool']?.misName !== 'CSV')}
                        loading={importSchoolDataLoading}
                    />
                    <br />
                    <br />
                </form>
            )}
        </Formik>
    );
};

export default CSVImport;
