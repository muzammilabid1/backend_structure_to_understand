import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import CommonStatus from './../../components/Shared/CommonStatus';

const LinkInvalidPage = ({ buttonText, onClickPath }) => {
    const router = useRouter();

    return (
        <CommonStatus
            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-oops.png`}
            imageAlt=""
            heading="This link is invalid"
            subHeading="Either it’s already been used or the link address is not correct."
            buttonText={buttonText}
            onClick={() => router?.push(onClickPath)}
        />
    );
};

LinkInvalidPage.propTypes = {
    buttonText: PropTypes.string,
    onClickPath: PropTypes.string
};

LinkInvalidPage.defaultProps = {
    buttonText: 'Back to login page',
    onClickPath: '/'
};

export default LinkInvalidPage;
