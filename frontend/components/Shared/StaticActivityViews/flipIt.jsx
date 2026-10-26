/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const FlipIt = () => {
    return (
        <div className="what_is">
            <Heading1 centerText text="Flip-It!" />
            <br />

            <Divider customClass=" mb5" />

            <Paragraph>
                <b>How to play:</b>
                <br />
                One player tells a story. But every time the other player says “Flip-It!” you have to start saying the opposite.
                <br />
                <br />
                <b>Example:</b>
                <br />
                Once upon a time there was a princess who lived in an enormous palace…
                <br />
                “Flip-It!” <br />
                …in a tiny shed. She had only her goats for company, and worked hard all day long…
                <br />
                “Flip-It!” <br />
                …all night long in the sweet factory. The factory was owned by a powerful wizard…
                <br />
                “Flip-It!” <br />
                … a wizened old crone. The princess would often fall asleep while she worked, and each time the crone would shout to wake
                her up…
                <br />
                “Flip-It!” <br />
                … bring her a cup of coffee and gently rouse her from sleep. Yet as soon as she was fully awake and had drunk her coffee,
                the crone would set her back to work just as hard as before. <br />
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group7.png`}
                    alt="this place"
                />
            </div>
            <br />
        </div>
    );
};

export default FlipIt;
