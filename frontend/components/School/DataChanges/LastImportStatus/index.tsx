import { useQuery } from '@apollo/client';
import { ImportStatus } from 'lwp-shared';
import Link from 'next/link';
import { useMemo } from 'react';

import { getParameters } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { showDate } from '../../../../shared/Services/handler';
import { ILwpSchool } from '../../../../types/entities/ILwpSchool';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonStatus from '../../../Shared/CommonStatus';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface LastImportStatusProps {
    school: ILwpSchool;
}

const LastImportStatus = ({ school }: LastImportStatusProps) => {
    const { data, loading } = useQuery(getParameters, {
        variables: { keys: ['TEACHER_SUPPORT_EMAIL', 'TEACHER_SUPPORT_PHONE_NUMBER'] },
        skip: !school || school.importStatus !== ImportStatus.FAILED
    });

    const { subTitle, title, image } = useMemo(() => {
        const [teacherSupportEmail, teacherSupportPhoneNumber] = data?.getParameters ?? [];
        let image = '';
        let title = '';
        let subTitle: React.ReactNode = null;

        if (!school?.importStatus) {
            title = 'No data imported yet';
            subTitle = <Paragraph text="We haven't imported any data for your school yet." />;
            image = 'koala-oops.png';
        } else if (school?.importStatus === ImportStatus.FAILED) {
            title = `The last import on ${showDate({ date: school.lastImportedAt, justDate: true })} was unsuccessful.`;
            subTitle = (
                <Paragraph>
                    If you need help with something, you can email us at{' '}
                    <Link passHref href={`mailto:${teacherSupportEmail?.value}`}>
                        {teacherSupportEmail?.value}
                    </Link>{' '}
                    or phone us on <b>{teacherSupportPhoneNumber?.value}</b>.
                </Paragraph>
            );
            image = 'koala-oops.png';
        } else {
            title = `No remaining changes`;
            subTitle = <Paragraph text={`The last import succeeded on ${showDate({ date: school?.lastImportedAt, justDate: true })}.`} />;

            image = 'koala-yay.png';
        }

        return { image, title, subTitle };
    }, [school, data]);

    return (
        <div>
            {loading ? (
                <CommonLoading />
            ) : (
                /* The "include previously rejected changes" toggle is hidden while diffing is
                 * disabled: a completed school is back on the legacy sync, so the toggle would only
                 * ever surface the frozen rejects of its one-off review. Restore it (rendering
                 * PupilDiffingFilter here, as DiffingChanges still does) when diffing comes back. */
                <div className="last-import-status-container">
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${image}`}
                        imageAlt="Koala"
                        headingDataTest="data-changes-last-import-title"
                        heading={title}>
                        {subTitle}
                    </CommonStatus>
                </div>
            )}
        </div>
    );
};

export default LastImportStatus;
