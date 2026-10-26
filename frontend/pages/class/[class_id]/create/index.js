import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import CommonLoading from '../../../../components/Shared/CommonLoading';
import { PageType } from '../../../../types/enums/PageType';

const CreateGroups = () => {
    const { push, query } = useRouter();

    useEffect(() => {
        if (query?.class_id) {
            push({ pathname: `/class/${query?.class_id}/create/classes-group` });
        }
    }, [query]);

    return <CommonLoading />;
};

CreateGroups.pageType = PageType.TEACHER;
CreateGroups.pageTitle = 'Class: Create';

export default CreateGroups;
