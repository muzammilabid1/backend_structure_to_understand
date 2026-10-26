import React, { useContext, useEffect } from 'react';

import CommonStatus from '../../../components/Shared/CommonStatus';
import { getJwtDecoded } from '../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const SetTopicPage = () => {
    const { callSnackbar } = useContext(ThemeContext);

    useEffect(() => {
        callSnackbar('This page is for teachers only.', 'error');
    }, []);

    return (
        <CommonStatus
            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
            imageAlt={''}
            heading={'Nothing to show here'}
        />
    );
};

SetTopicPage.pageType = PageType.TEACHER;
SetTopicPage.pageTitle = 'Set a topic';

export default SetTopicPage;

export const getServerSideProps = async (context) => {
    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];

    if (!accessToken) return false;

    const token = getJwtDecoded(accessToken);

    if (token?.schoolId) {
        return {
            redirect: {
                permanent: false,
                destination: `/school/${token?.schoolId}/set-topic/${context?.query?.topic_id}`
            }
        };
    }

    return {
        props: {}
    };
};
