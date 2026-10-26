/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import ReactCarousel from '../ReactCarousel';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const IFeelSaid = () => {
    return (
        <div className="i_fee_said">
            <Heading1 centerText text="I Feel Said" />
            <br />

            <Divider customClass=" mb5" />

            <Paragraph>
                <b>The aim of the game:</b>
                <br />
                Show how the character is feeling by changing the “said” word. Say your sentences out loud (no need to write them down).
            </Paragraph>
            <br />
            <br />

            <Paragraph>
                Examples:
                <br />
                “Oh no!” said James sadly. <span className="_span">→</span> “Oh no!” wept James.
                <br />
                “It wasn’t an accident!” she said angrily. <span className="_span">→</span> “It wasn’t an accident!” she snarled.
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group5.png`}
                    alt="this place"
                />
            </div>
            <br />

            <Paragraph>
                See below for some more sentences you could edit. Click the left and right buttons to scroll through different options.
                Alternatively, click the button below to download and print off the sentences.
            </Paragraph>

            <br />

            <ReactCarousel array={sharedJson?.iFeelSaidCarouselTitles} />

            <div className="btn_container">
                <DownloadPDFBtn color="inherit" btnText="Download printable version" url="/assets/pdf-files/IFeelSaid.pdf" />
            </div>
        </div>
    );
};

export default IFeelSaid;
