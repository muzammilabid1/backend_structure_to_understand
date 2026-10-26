import { useMutation } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';

import { reGenerateMagicLink } from '../../graphQl/mutations';
import { MAGIC_LINK_TYPES, MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import Paragraph from '../Shared/Typography/Paragraph';
import CommonStatus from './../../components/Shared/CommonStatus';

// Only say a new link was sent once it has been; it is refused e.g. for a teacher at an inactive school.
export const expiredLinkMessage = ({ called, loading, error }) => {
    if (!called || loading) return null;
    if (error) return 'This link can no longer be used. Please contact support.';
    return 'We have sent you another message with a new link. Please check your messages.';
};

const LinkExpiredPage = ({ token, magicLinkType, schoolId, isUserLoggedIn }) => {
    const router = useRouter();
    // onError stops a refusal going unhandled; the error is read from the result instead.
    const [reGenerateMagicLinkMutation, reGenerateMagicLinkResult] = useMutation(reGenerateMagicLink, { onError: () => {} });

    useEffect(() => {
        if (!token) return;

        if (magicLinkType === MAGIC_LINK_TYPES.SCHOOL_IMPACT_REPORT) return;
        reGenerateMagicLinkMutation({ variables: { token } });
    }, [token, magicLinkType]);

    return token && magicLinkType !== MAGIC_LINK_TYPES.SCHOOL_IMPACT_REPORT ? (
        <CommonStatus
            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-oops.png`}
            imageAlt=""
            heading="This link has expired"
            subHeading={expiredLinkMessage(reGenerateMagicLinkResult)}
            buttonText="Back to login page"
            onClick={() => router?.push('/')}
        />
    ) : (
        <div className="expired-school-impact-report">
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-oops.png`}
                imageAlt=""
                heading="This link has expired"
                buttonText={isUserLoggedIn ? 'Go to school impact report page' : null}
                subHeading={
                    isUserLoggedIn
                        ? `If you are a school leader for this school, you can go to the school impact report page to access the report and/or generate a new link.`
                        : null
                }
                onClick={() => router?.push(`/school/${schoolId}/reports`)}
            />
            {!isUserLoggedIn ? (
                <Paragraph customClass="expired-school-impact-report-paragraph">
                    If you are a school leader for this school, you can{' '}
                    <a className="expired-school-impact-report-paragraph-link" href={`/school/${schoolId}/reports`}>
                        <u>log in</u>
                    </a>{' '}
                    to access the report and/or generate a new link.{' '}
                </Paragraph>
            ) : null}
        </div>
    );
};

LinkExpiredPage.propTypes = {
    token: PropTypes.string,
    magicLinkType: PropTypes.string,
    schoolId: PropTypes.string,
    isUserLoggedIn: PropTypes.boolean
};

export default LinkExpiredPage;
