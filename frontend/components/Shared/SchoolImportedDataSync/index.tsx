/* eslint-disable @next/next/no-img-element */
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { ImportStatus } from 'lwp-shared';
import moment from 'moment';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { ILwpSchool } from '../../../types/entities/ILwpSchool';
import { useLwpAppContext } from '../../AuthProvider';
import LWPButton from '../Button/LWPButton';
import CommonError from '../CommonError';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

interface SchoolImportedDataSyncProps {
    school: ILwpSchool;
}

const getSchool = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            importStatus
            lastImportedAt
        }
    }
`;

const resyncWondeData = gql`
    mutation resyncWondeData($schoolId: String!, $wondeSchoolId: String!) {
        resyncWondeData(schoolId: $schoolId, wondeSchoolId: $wondeSchoolId) {
            importStatus
            lastImportedAt
        }
    }
`;

const SchoolImportedDataSync = ({ school }: SchoolImportedDataSyncProps) => {
    const router = useRouter();
    const { callSnackbar } = useLwpAppContext();
    const [lastSyncData, setLastSyncData] = useState<{ lastImportedAt: string; importStatus: ImportStatus }>({
        lastImportedAt: null,
        importStatus: null
    });
    const [resyncWondeDataMutation, { loading, called }] = useMutation(resyncWondeData);

    const [getSchoolQuery] = useLazyQuery(getSchool);

    useEffect(() => {
        if (school) {
            setLastSyncData({
                lastImportedAt: school.lastImportedAt,
                importStatus: school.importStatus
            });
        }
    }, [school]);

    useEffect(() => {
        let interval;

        if (lastSyncData.importStatus === ImportStatus.IMPORTING_DATA) {
            interval = setInterval(async () => {
                const res = await getSchoolQuery({ variables: { id: school?.id } });
                const updatedSchool = res?.data?.getSchool;

                if (updatedSchool && updatedSchool?.importStatus !== ImportStatus.IMPORTING_DATA)
                    setLastSyncData((prv) => ({
                        ...prv,
                        importStatus: updatedSchool?.importStatus,
                        lastImportedAt: updatedSchool?.lastImportedAt
                    }));
            }, 5000);
        } else {
            clearInterval(interval);
        }

        return () => clearInterval(interval);
    }, [called, lastSyncData, school?.id]);

    const isDataChangesStep = [ImportStatus.LINKING_PUPILS, ImportStatus.LINKING_CLASSES, ImportStatus.DIFFING_ENTITIES].includes(
        lastSyncData?.importStatus
    );

    const isDataImportFailedOrNeedPermission = [ImportStatus.FAILED, ImportStatus.PERMISSION_NEED_UPDATING].includes(
        lastSyncData?.importStatus
    );
    const isWrongAcademicYear = lastSyncData?.importStatus === ImportStatus.WRONG_ACADEMIC_YEAR;
    const isSchoolHaveNotImportedSchoolId = !school?.importedSchool?.id;

    const handleResyncWondeData = async () => {
        try {
            const res = await resyncWondeDataMutation({
                variables: {
                    schoolId: school?.id,
                    wondeSchoolId: school?.importedSchool?.id
                }
            });

            const resyncData = res?.data?.resyncWondeData;

            setLastSyncData({
                lastImportedAt: resyncData?.lastImportedAt,
                importStatus: resyncData?.importStatus
            });
            if (resyncData?.importStatus === ImportStatus.COMPLETE) {
                callSnackbar("We've imported you're data from Wonde and you're all set!", 'success');
                router.reload();
            }
        } catch (error) {
            console.error('Error resyncing Wonde data:', error);
        }
    };

    const { title, subTitle, image, btnText, btnHandler } = useMemo(() => {
        let obj = {
            title: '',
            subTitle: '',
            image: '',
            btnText: '',
            btnHandler: null
        };

        const misName = school?.misName && school?.misName != '[Unknown]' ? school?.misName : 'Wonde';

        if (isDataChangesStep) {
            obj = {
                title: 'Data imported - please check to continue',
                subTitle: `We've successfully imported your school’s data for this academic year from ${misName}. Please check the data to proceed with your launch.`,
                image: 'adult-mathscot.png',
                btnText: 'Check imported data',
                btnHandler: () => router.push(`/school/${school?.id}/data-changes`)
            };
        } else if (isDataImportFailedOrNeedPermission) {
            obj = {
                ...obj,
                title: 'Could not import data',
                subTitle: `We have not been able to import any data for pupils in your school. Please make sure the appropriate permissions have been approved in the Wonde dashboard.`,
                image: 'mathscot-oops.png',
                btnHandler: handleResyncWondeData,
                btnText: `Sync with ${misName}`
            };
        } else if (isWrongAcademicYear) {
            obj = {
                ...obj,
                title: 'No data for current academic year',
                subTitle: `After your school’s data is updated in ${misName}, it may take 1 or 2 days to appear in the platform.`,
                image: 'mathscot-oops.png',
                btnHandler: handleResyncWondeData,
                btnText: `Sync with ${misName}`
            };
        } else if (isSchoolHaveNotImportedSchoolId) {
            obj = {
                ...obj,
                title: 'Could not import data',
                subTitle: `We have not been able to import any data for pupils in your school. If you have only recently approved our access to your MIS, the team will enable the connection soon.`,
                image: 'mathscot-oops.png'
            };
        }

        return obj;
    }, [school, isDataChangesStep, isDataImportFailedOrNeedPermission, isWrongAcademicYear, router, isSchoolHaveNotImportedSchoolId]);

    const { errorMessage, isBtnDisabled } = useMemo(() => {
        let errorMessage = null;
        let isBtnDisabled = false;

        if (!lastSyncData?.lastImportedAt) return { errorMessage, isBtnDisabled };

        const now = moment();
        const expiry = moment(lastSyncData?.lastImportedAt).add(1, 'hour');
        const isReady = now.isSameOrAfter(expiry);

        if (!isDataChangesStep) isBtnDisabled = !isReady;

        if ((isDataImportFailedOrNeedPermission || isWrongAcademicYear) && !isReady) {
            const human = now.to(expiry, true);

            errorMessage = `The latest data was checked for your school recently. Please try again in ${human}.`;
        } else if (lastSyncData?.importStatus === ImportStatus.FAILED) {
            errorMessage = 'Failed to sync with Wonde. Please try again later.';
        }

        return { errorMessage, isBtnDisabled };
    }, [isDataImportFailedOrNeedPermission, isWrongAcademicYear, lastSyncData]);

    if (!(isDataChangesStep || isDataImportFailedOrNeedPermission || isWrongAcademicYear || isSchoolHaveNotImportedSchoolId)) return null;

    const isLoading = loading || lastSyncData.importStatus === ImportStatus.IMPORTING_DATA;

    return (
        <div className={`school-imported-data-sync`}>
            <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${image}`} alt="MathsCot Oops" />
            <div className="sync-message-content">
                <Heading1 text={title} />
                <Paragraph text={subTitle} />
                {btnText && btnHandler && <LWPButton btnText={btnText} onClick={btnHandler} loading={isLoading} disabled={isBtnDisabled} />}
                {errorMessage && !isLoading ? <CommonError error={errorMessage} touched /> : null}
            </div>
        </div>
    );
};

export default SchoolImportedDataSync;
