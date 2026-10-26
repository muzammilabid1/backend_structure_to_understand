/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const LightningInTheFridge = () => {
    return (
        <div className="happy_birthday improveIt LightningInTheFridge">
            <Heading1 centerText text="Lightning in the Fridge" />
            <br />
            <Divider customClass=" mb5" />
            <Paragraph>
                <b>How to play:</b>
            </Paragraph>
            <ol>
                <li>
                    Choose ten words from the list each and write them on scraps of paper (check the spelling carefully after you&apos;ve
                    written your cards. Click the button below to download a PDF with them in).
                </li>
            </ol>

            <div className="btn_container">
                <DownloadPDFBtn btnText="Word list (PDF)" url="/assets/pdf-files/LightningInTheFridge.pdf" />
            </div>
            <ol>
                <li className="hidden_item" />
                <li>Hide the words around the house, but in places where they will be found easily and soon. </li>
                <li>
                    Go about your daily life, but when you find one the other person hid, read it to them and then take it away to hide
                    again somewhere else.
                </li>
            </ol>
            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group11.png`}
                    alt="this place"
                />
            </div>
            <br />
        </div>
    );
};

export default LightningInTheFridge;
