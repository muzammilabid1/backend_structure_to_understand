/* eslint-disable @next/next/no-img-element */
import { SubjectProgrammeType } from 'lwp-shared/enums';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { IWholeSchoolAutoScheduleProgramme } from '../../../types/entities/IWholeSchoolSequencePreview';
import LWPButton from '../../Shared/Button/LWPButton';
import Paragraph from '../../Shared/Typography/Paragraph';

/** Each banner's mascot, by programme rather than by subject name. */
const BANNER_IMAGE: Partial<Record<SubjectProgrammeType, string>> = {
    [SubjectProgrammeType.MONEY_SKILLS]: 'two-koala-with-a-coin.png',
    [SubjectProgrammeType.READY_TEDDY]: 'teddy.png'
};

interface ProgrammeBannerProps {
    programme: IWholeSchoolAutoScheduleProgramme;
    text: string;
    dataTest: string;
    buttonDataTest: string;
    onClick: () => void;
}

/**
 * One programme's call to auto-schedule, on the Auto schedule tab (LEA-6687) and the school
 * overview (LEA-6688). Only a programme that can be scheduled is ever given one, so the button is
 * always live.
 */
const ProgrammeBanner = ({ programme, text, dataTest, buttonDataTest, onClick }: ProgrammeBannerProps) => (
    <div className="auto-schedule-programme-banner" data-programme={programme.programmeType} data-test={dataTest}>
        <img
            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${
                BANNER_IMAGE[programme.programmeType] ?? 'mathscot-thinking.png'
            }`}
            alt=""
        />
        <Paragraph text={text} customClass="auto-schedule-programme-banner-text" />
        <LWPButton btnText="Auto-schedule" dataTest={buttonDataTest} onClick={onClick} />
    </div>
);

export default ProgrammeBanner;
