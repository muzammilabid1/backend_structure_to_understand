import { gql, useMutation, useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useMemo, useState } from 'react';

import { handleErrorSnackbar, processText, ThemeContext } from '../../../shared/Services/handler';
import { ILwpSchool } from '../../../types/entities/ILwpSchool';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonButtonGroup from '../../Shared/CommonButtonGroup';
import CommonLoading from '../../Shared/CommonLoading';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';

const generateCSVForLeaderQuery = gql`
    mutation generateCSVForLeaderQuery($id: String!, $schoolId: String!, $periodIndex: Float!) {
        generateCSVForLeaderQuery(id: $id, schoolId: $schoolId, periodIndex: $periodIndex)
    }
`;

const getSchoolLeaderQueries = gql`
    query getSchoolLeaderQueries($subjectType: SchoolSubjectType!) {
        getSchoolLeaderQueries(subjectType: $subjectType) {
            id
            name
            category
            description
            isAvailableForPreviousYear
        }
    }
`;

const getSchoolPreviousAcademicYearForDataDownload = gql`
    query getSchoolPreviousAcademicYearForDataDownload($schoolId: String!) {
        getSchoolPreviousAcademicYearForDataDownload(schoolId: $schoolId) {
            index
            shortName
        }
    }
`;

interface SchoolLeaderQuery {
    id: string;
    name: string;
    category?: 'BOTH' | 'TOPICS' | 'READING';
    description?: string;
    isAvailableForPreviousYear?: boolean;
}

interface SchoolDataDownloadProps {
    schoolDetails: ILwpSchool;
}

const SchoolDataDownload = ({ schoolDetails }: SchoolDataDownloadProps) => {
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);
    const [loadingId, setLoadingId] = useState(null);
    const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<string>(null);
    const schoolId = queryParams?.school_id;

    const { loading, error, data } = useQuery(getSchoolLeaderQueries, {
        variables: { subjectType: schoolDetails?.schoolSubjectType },
        skip: !schoolDetails?.schoolSubjectType
    });

    const { error: previousYearError, data: previousYearData } = useQuery(getSchoolPreviousAcademicYearForDataDownload, {
        variables: { schoolId },
        skip: !schoolId
    });

    const [generateCSVLeaderQueryMutation] = useMutation(generateCSVForLeaderQuery);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, previousYearError);
    }, [error, previousYearError]);

    const currentPeriod = schoolDetails?.curentPeriod;
    const previousPeriod = previousYearData?.getSchoolPreviousAcademicYearForDataDownload;

    const periodOptions =
        currentPeriod?.index != null && previousPeriod
            ? [
                  {
                      key: String(currentPeriod.index),
                      name: `This academic year (${currentPeriod.shortName})`,
                      dataTest: 'download-current-academic-year'
                  },
                  {
                      key: String(previousPeriod.index),
                      name: `Last academic year (${previousPeriod.shortName})`,
                      dataTest: 'download-previous-academic-year'
                  }
              ]
            : [];

    const activePeriodIndex = selectedPeriodIndex ?? String(currentPeriod?.index);

    const _onDownload = async (id: string) => {
        try {
            setLoadingId(id);
            const resp = await generateCSVLeaderQueryMutation({
                variables: {
                    id,
                    schoolId,
                    periodIndex: Number(activePeriodIndex)
                }
            });

            if (resp?.data?.generateCSVForLeaderQuery) {
                window.location.href = resp?.data?.generateCSVForLeaderQuery;
                callSnackbar('Query downloading!', 'success');
            }
        } catch (err) {
            callSnackbar(err, 'error');
        } finally {
            setLoadingId(null);
        }
    };

    // Some reports only make sense for the year in progress.
    const isPreviousYearSelected = previousPeriod && +activePeriodIndex === +previousPeriod.index;

    const schoolLeaderQueries: SchoolLeaderQuery[] = useMemo(() => {
        const allQueries: SchoolLeaderQuery[] = data?.getSchoolLeaderQueries || [];

        if (isPreviousYearSelected) return allQueries.filter((leaderQuery) => leaderQuery?.isAvailableForPreviousYear);

        return allQueries;
    }, [data, isPreviousYearSelected]);

    return (
        <div className="school_data_download_container">
            {periodOptions.length > 0 && (
                <CommonButtonGroup
                    groupBtn={periodOptions}
                    select={activePeriodIndex}
                    onClick={(periodIndex) => setSelectedPeriodIndex(periodIndex)}
                />
            )}
            {loading ? (
                <CommonLoading />
            ) : (
                schoolLeaderQueries?.map((data) => {
                    return (
                        <div className={`school_data_container ${data.category}`} key={data?.id}>
                            <div className="school_data_discription">
                                <Heading2 customClass="school_data_heading" text={processText(data?.name)} />
                                {data?.description ? <Paragraph text={data?.description} /> : null}
                            </div>
                            <div className="school_data_btn">
                                <LWPButton
                                    loading={loadingId === data?.id}
                                    onClick={() => _onDownload(data?.id)}
                                    btnText="Download CSV"
                                    startIcon="get_app"
                                />
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default SchoolDataDownload;
