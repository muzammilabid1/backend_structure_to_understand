import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useMemo } from 'react';

import { getAllStickersForSchool } from '../../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import CommonLoading from '../../../Shared/CommonLoading';
import StickerList from '../../../Shared/StickersList';
import Heading1 from '../../../Shared/Typography/Heading1';
import SchoolSettingsWrapper from '../SchoolSettingsWrapper';

const SchoolStickers = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const queryParam = useParams();
    const schoolId = queryParam?.school_id;

    const { error, loading, data } = useQuery(getAllStickersForSchool, {
        variables: {
            schoolId
        }
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const { active, inActive } = useMemo(() => {
        return {
            active: data?.getAllStickersForSchool?.active ?? [],
            inActive: data?.getAllStickersForSchool?.inActive ?? []
        };
    }, [data]);

    if (loading) return <CommonLoading />;

    return (
        <SchoolSettingsWrapper>
            <div className="school-stickers">
                <Heading1 text="Stickers" customClass="stickers-heading" />
                <StickerList activeStickers={active} inActiveSticker={inActive} />
            </div>
        </SchoolSettingsWrapper>
    );
};

export default SchoolStickers;
