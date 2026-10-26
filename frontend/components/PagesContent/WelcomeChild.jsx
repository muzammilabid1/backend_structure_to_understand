import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React from 'react';

import MathScoteWithTrophy from '../../components/Shared/MathScoteWithTrophy';
import { MINIO_PUBLIC_PATHS, PupilType } from '../../shared/Constant';
import Heading1 from './../Shared/Typography/Heading1';
import Paragraph from './../Shared/Typography/Paragraph';

const WelcomeChild = ({ customClass, link, images, child_name, subHeading = true, pupil }) => {
    const router = useRouter();

    const subHeadingVisible =
        subHeading &&
        (pupil?.currentClassOrGroupAcrossClasses?.isFullProgramme ||
            (pupil?.type === PupilType.BOTH && !pupil?.currentClassOrGroupAcrossClasses?.isReadyTeddyEnabled));

    return (
        <div>
            {child_name && <Heading1 text={`Welcome ${child_name}!`} centerText customClass={'welcome_child'} />}
            {subHeadingVisible && <Paragraph text="Finish activities to earn clothes, accessories, and awards." centerText />}
            {link ? (
                <div className={customClass} onClick={() => router?.push(link)}>
                    <MathScoteWithTrophy images={images} />
                </div>
            ) : images?.length > 0 ? (
                <MathScoteWithTrophy images={images} />
            ) : null}
        </div>
    );
};

const exampleImages = [
    {
        imgPath: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot-red-shirt.png`
    }
];

WelcomeChild.propTypes = {
    images: PropTypes.array,
    child_name: PropTypes.string,
    customClass: PropTypes.string,
    link: PropTypes.string,
    subHeading: PropTypes.bool,
    pupil: PropTypes.object
};

WelcomeChild.defaultProps = {
    images: exampleImages
};
export default WelcomeChild;
