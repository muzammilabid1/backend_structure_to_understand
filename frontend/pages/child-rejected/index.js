/* eslint-disable @next/next/no-img-element */
import React from 'react';

import Heading1 from '../../components/Shared/Typography/Heading1';
import Paragraph from '../../components/Shared/Typography/Paragraph';
import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import { PageType } from '../../types/enums/PageType';

const ChildRejected = () => {
    return (
        <div className="childRejected_container">
            <div className="childRejected_content">
                <div className="childRejected_image">
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/pupil_without_round_bg1.png`}
                        alt="Pupil with Mobile"
                    />
                </div>
                <Heading1 text="Thanks for letting us know!" centerText />
                <div className="childRejected_subheading">
                    <Paragraph text="You will not be contacted for this child and the school will be notified to update their records." />
                </div>
            </div>
        </div>
    );
};

ChildRejected.pageType = PageType.GENERAL;
ChildRejected.pageTitle = 'Child rejected';

export default ChildRejected;
