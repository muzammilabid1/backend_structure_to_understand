import { gql, useQuery } from '@apollo/client';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useMemo } from 'react';

import { useDelegatedClaims } from '../../../context/DelegatedClaimsContext';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { ILwpSchool } from '../../../types/entities/ILwpSchool';
import CommonLoading from '../../Shared/CommonLoading';
import Heading1 from '../../Shared/Typography/Heading1';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';

const getSchool = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            isParentFeedbackStickerFeatureEnabled
            isDataImportReviewEnabledForSchool
        }
    }
`;

const SchoolSettings = () => {
    const params = useParams();
    const schoolId = params.school_id as string;

    const { callSnackbar } = useContext(ThemeContext);
    const { setClaims } = useDelegatedClaims();
    const { data, loading, error } = useQuery(getSchool, {
        variables: { id: schoolId },
        skip: !schoolId
    });

    useEffect(() => {
        setClaims({ schoolId });
    }, [schoolId]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const schoolDetails: ILwpSchool = useMemo(() => data?.getSchool, [data]);

    const settings = [
        {
            title: 'Imported pupil data',
            description: 'See the current status of any data imports in progress for your school',
            name: 'data-changes',
            link: '/data-changes',
            visible: schoolDetails?.isDataImportReviewEnabledForSchool
        },
        {
            title: 'Holiday dates',
            description: "Set school holidays to ensure topics aren't assigned during non-teaching periods",
            name: 'holiday-dates',
            link: 'settings/holiday-dates',
            visible: true
        },
        {
            title: 'Stickers',
            description: 'Create, edit, or delete stickers used to reward pupils for feedback',
            name: 'stickers',
            link: 'settings/stickers',
            visible: schoolDetails?.isParentFeedbackStickerFeatureEnabled
        },
        {
            title: 'Pupil tags',
            description: 'Group pupils by reading levels or other criteria using customizable tags',
            name: 'pupil-tag',
            link: 'settings/pupil-tag',
            visible: true
        },
        {
            title: 'Configuration',
            description: 'Control platform features',
            name: 'configuration',
            link: 'settings/configuration',
            visible: true
        },
        {
            title: 'Teachers',
            description: 'View, manage, and add teachers to school',
            name: 'teachers',
            link: 'settings/teachers',
            visible: true
        }
    ].filter((setting) => setting.visible);

    return (
        <div className="school-settings-page">
            <Heading1 text="Settings" />
            <div className="settings-list">
                {loading ? (
                    <CommonLoading />
                ) : (
                    settings.map((setting, index) => (
                        <Link
                            key={index}
                            href={`/school/${schoolId}/${setting.link}`}
                            className="setting-item"
                            data-test={`school-settings-${setting.name}`}>
                            <div>
                                <Heading2 text={setting.title} />
                                <Paragraph text={setting.description} />
                            </div>
                            <ChevronRightIcon fontSize={'large'} />
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default SchoolSettings;
