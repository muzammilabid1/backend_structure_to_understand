import { useRouter } from 'next/compat/router';
import React, { useEffect } from 'react';

import CommonLoading from '../components/Shared/CommonLoading';
import { getCookie, getJwtDecoded } from '../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, ADMIN, MAGIC_LINK_TYPES, MAGICPARENT, PARENT, TEACHER, TOPICACCESS } from '../shared/Constant';
import { PageType } from '../types/enums/PageType';

const RootPage = () => {
    const router = useRouter();
    const jwt = getCookie(ACCESS_TOKEN_COOKIE);
    const token = jwt && getJwtDecoded(jwt);

    useEffect(() => {
        let basePage = '/';

        switch (token?.userType) {
            case ADMIN:
                basePage = token?.restrictSiteData ? '/admin/topics' : '/admin/all-feeds';
                break;

            case TEACHER:
                if (token?.isSchoolLeader) {
                    basePage = `/school/${token?.schoolId}`;
                } else {
                    basePage = `/feed/${token?.sub}`;
                }

                break;

            case PARENT:
                basePage = `/parent/${token?.sub}`;
                break;

            case TOPICACCESS:
                if (!token?.pupilTopicId) {
                    basePage = `/child/${token.pupilId}`;
                } else if (token?.magiclink_type === MAGIC_LINK_TYPES.TROPHY) {
                    basePage = `/child/${token.pupilId}/trophies`;
                } else if (token?.magiclink_type === MAGIC_LINK_TYPES.READING) {
                    basePage = `/child/${token.pupilId}/reading?topicId=${token.pupilTopicId}`;
                } else {
                    basePage = `/topic/${token?.pupilTopicId}`;
                }

                break;

            case MAGICPARENT:
                basePage = `/parent/${token?.sub}`;

                break;

            default:
                basePage = '/';
                break;
        }

        if (basePage) {
            router?.replace(basePage);
        } else {
            window.location.reload();
        }
    }, []);

    return <CommonLoading />;
};

RootPage.pageType = PageType.GENERAL;
RootPage.pageTitle = 'Home';

export default RootPage;
