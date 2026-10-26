/* eslint-disable @next/next/no-img-element */
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert, Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import React from 'react';

import { SchoolClassStatus } from '../../../shared/Constant';
import { isReadyTeddyNonPreadmission, renderClassIcon } from '../../../shared/Services/handler';
import { ILwpSchoolClass } from '../../../types/entities/ILwpSchoolClass';
import { ILwpSchoolClassDetails } from '../../../types/ILwpSchoolClass';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import LWPButton from '../../Shared/Button/LWPButton';
import SubjectTags from '../../Shared/SubjectTags';
import Heading1 from '../../Shared/Typography/Heading1';

interface ClassHeaderProps {
    schoolClassData: ILwpSchoolClassDetails;
}

const ClassHeader = ({ schoolClassData }: ClassHeaderProps) => {
    const router = useRouter();

    return (
        <div>
            {schoolClassData?.parentClass && (
                <>
                    <LWPButton
                        btnText={schoolClassData?.parentClass?.name}
                        startIcon="navigate_before"
                        color="inherit"
                        variant="text"
                        size="medium"
                        onClick={() => router?.push(`/class/${schoolClassData?.parentClass?.id}/readingweek`)}
                    />
                    <br />
                    <br />
                </>
            )}

            {schoolClassData?.academicYearInfo?.isInPreviousAcademicYear ? (
                <Grid item style={{ marginBottom: '24px' }}>
                    <Alert severity={'warning'} icon={<HelpOutlineIcon />}>
                        {`You’re viewing content from a previous academic year (${schoolClassData?.academicYearInfo?.shortName}).`}
                    </Alert>
                </Grid>
            ) : null}

            <Grid container>
                <Grid lg md sm xs>
                    <div className="class-register-header-container">
                        {schoolClassData?.status === SchoolClassStatus.ACTIVE &&
                            (schoolClassData?.isRegistrationClass || schoolClassData?.isGroupAcrossClasses) && (
                                <div
                                    className={
                                        renderClassIcon(schoolClassData).isGroupAcrossClasses
                                            ? 'class-register-header-image-group-across-classes'
                                            : renderClassIcon(schoolClassData).isFullProgramOrOnlyReadyTeddy
                                              ? 'class-register-header-image-fullProgramme'
                                              : 'class-register-header-image-reading'
                                    }>
                                    <img src={renderClassIcon(schoolClassData).classIcon} alt="logo" />
                                </div>
                            )}

                        <Heading1 dataTest="class-name-heading" text={schoolClassData?.schoolClassName} customClass="heading" />
                        <SubjectTags type={schoolClassData?.subjects} isReadingClass={schoolClassData?.IsReadingLogsEnabled} />
                        {schoolClassData?.status === SchoolClassStatus.ACTIVE &&
                        isReadyTeddyNonPreadmission(schoolClassData as ILwpSchoolClass) ? (
                            <div className="add-other-programm-icon">
                                <CommonIconButton
                                    icon="add"
                                    toolTipTitle="Add more"
                                    onClick={() => router.push(`/class/${schoolClassData?.id}/class-details`)}
                                />
                            </div>
                        ) : null}
                    </div>
                </Grid>
                {schoolClassData?.status === SchoolClassStatus.ACTIVE && (
                    <Grid>
                        <LWPButton
                            btnText={`${schoolClassData?.isRegistrationClass ? 'Class' : 'Group'} settings`}
                            startIcon="settings"
                            color="inherit"
                            variant="text"
                            onClick={() => router?.push(`/class/${router?.query?.class_id}/class-details`)}
                        />
                    </Grid>
                )}
            </Grid>
        </div>
    );
};

export default ClassHeader;
