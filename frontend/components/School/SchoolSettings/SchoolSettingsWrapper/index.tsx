import { useRouter } from 'next/router';
import { useMemo } from 'react';

import LWPButton from '../../../Shared/Button/LWPButton';

interface SchoolSettingsWrapperProps {
    children: React.ReactNode;
}

const SchoolSettingsWrapper = ({ children }: SchoolSettingsWrapperProps) => {
    const router = useRouter();
    const schoolId = router?.query?.school_id as string;

    const asPath = router?.asPath;

    const breadCrumbs = useMemo(() => {
        if (asPath.includes('create-sticker'))
            return {
                label: 'Stickers',
                link: 'stickers'
            };

        return {
            label: 'Settings',
            link: ''
        };
    }, [asPath]);

    return (
        <div className="school-settings-wrapper">
            <LWPButton
                btnText={breadCrumbs.label}
                startIcon="navigate_before"
                color="inherit"
                variant="text"
                size="medium"
                customClass="school-settings-back-button"
                onClick={() => router?.push(`/school/${schoolId}/settings/${breadCrumbs.link}`)}
            />
            {children}
        </div>
    );
};

export default SchoolSettingsWrapper;
