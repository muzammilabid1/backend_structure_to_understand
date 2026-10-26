/* eslint-disable @next/next/no-img-element */
import { FeatureTooltipTargets } from 'lwp-shared';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext } from 'react';

import { useDelegatedClaimsSubscriber } from '../../../context/DelegatedClaimsContext';
import { ADMIN, MINIO_PUBLIC_PATHS, TEACHER } from '../../../shared/Constant';
import { isAdminViewAsMode, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../Button/CommonIconButton';
import CommonListWithIcon from '../CommonListWithIcon';
import CommonPopOver from '../CommonPopOver';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import UserAnnouncementsDrawer from '../UserAnnouncementsDrawer';

interface TeacherHeaderProps {
    heading: string;
    adminAndTeacherProfilePopOverList: {
        text: string;
        image: string;
        onClick?: () => void;
        dataTest?: string;
    }[];
}

const TeacherHeader = ({ adminAndTeacherProfilePopOverList, heading }: TeacherHeaderProps) => {
    const { token, userAnnouncementContext } = useContext(ThemeContext);
    const { schoolId } = useDelegatedClaimsSubscriber();
    const router = useRouter();

    const isHelpAndResourcesIconVisible =
        (token?.userType === ADMIN && isAdminViewAsMode(token?.userType, router.pathname)) || token?.userType === TEACHER;

    return (
        <div className="teacher-header">
            <Link href={'/'} className="a_tag">
                <div className="teacher-header-logo">
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/profile-logo.png`}
                        alt="Learning with Parents logo"
                        className="profile-logo"
                    />
                    <Heading1 text={heading} />
                </div>
            </Link>

            <div className="teacher-header-actions">
                {token?.sub && userAnnouncementContext?.hasAnnouncements ? <UserAnnouncementsDrawer /> : null}
                {isHelpAndResourcesIconVisible ? (
                    <CommonIconButton
                        icon="help_outline"
                        size="large"
                        onClick={() => router.push(`/school/${token?.schoolId || router?.query?.school_id || schoolId}/resources`)}
                        toolTipTitle="Help and resources"
                        id={FeatureTooltipTargets.HELP_AND_RESOURCES}
                    />
                ) : null}

                <CommonPopOver
                    element={
                        <div className="teacher-header-popover">
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mathscot.svg`}
                                alt="Mathscot"
                            />
                            <Paragraph text={`${token?.firstName} ${token?.lastName}`} style={{ margin: 0 }} />
                            <span data-test="teacher-and-admin-popover-list-expand-icon" className={`material-icons`}>
                                expand_more
                            </span>
                        </div>
                    }>
                    <CommonListWithIcon list={adminAndTeacherProfilePopOverList} />
                </CommonPopOver>
            </div>
        </div>
    );
};

export default TeacherHeader;
