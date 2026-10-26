import { useRouter } from 'next/router';
import React, { createContext, ReactNode, useMemo } from 'react';

import { useLwpAppContext } from '../components/AuthProvider';
import Unauthorized from '../components/Unauthorized';
import { ADMIN, MAGICPARENT, PARENT, TEACHER, TOPICACCESS } from '../shared/Constant';
import { PageType } from '../types/enums/PageType';

interface PageInfoContextProps {
    pageType: PageType | null;
}

const PageInfoContext = createContext<PageInfoContextProps>({
    pageType: null
});

interface PageInfoProviderProps {
    children: ReactNode;
    pageType: PageType | null;
}

export const PageInfoProvider: React.FC<PageInfoProviderProps> = ({
    children,
    pageType = PageType.ADMIN /** After the discussion [https://github.com/learningwithparents/platform/pull/1844#discussion_r2493782881], we decided to default to ADMIN. If no pageType is defined on any page, it will be considered an ADMIN page. */
}) => {
    const { token } = useLwpAppContext();
    const router = useRouter();

    const isAuthorized = useMemo(() => {
        const loggedInUserType = token?.userType;

        if (token?.userType === ADMIN) return true;

        if (pageType === PageType.ADMIN && loggedInUserType === ADMIN) return true;

        if (pageType === PageType.SCHOOL_LEADER && token?.isSchoolLeader) return true;

        if (pageType === PageType.TEACHER && loggedInUserType === TEACHER) return true;

        if (pageType === PageType.PARENT && [TOPICACCESS, MAGICPARENT, PARENT, ADMIN, TEACHER].includes(loggedInUserType)) return true;

        if (pageType === PageType.GENERAL) return true;

        return false;
    }, [pageType, token, router]);

    return <PageInfoContext.Provider value={{ pageType }}>{isAuthorized ? children : <Unauthorized />}</PageInfoContext.Provider>;
};
