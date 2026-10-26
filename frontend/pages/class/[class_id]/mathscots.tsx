import { useQuery } from '@apollo/client';
import { FormControl, FormControlLabel, Grid, Radio, RadioGroup } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import ClassHeader from '../../../components/Class/ClassHeader';
import SimpleChildCard from '../../../components/Shared/Cards/SimpleChildCard';
import CommonLoading from '../../../components/Shared/CommonLoading';
import CommonNavTabs from '../../../components/Shared/CommonNavTabs';
import CommonPopOver from '../../../components/Shared/CommonPopOver';
import CommonStatus from '../../../components/Shared/CommonStatus';
import { getClassPupils, getSchoolClass } from '../../../graphQl/queries';
import { DEFAULT_EMPTY_IMAGE, MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { isReadyTeddyEnabledClassOnly, ThemeContext } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const Mathscots = () => {
    const { push, query } = useRouter();
    const [classPupils, setClassPupils] = useState([]);
    const [value, setValue] = useState('activePupils');
    const { callSnackbar } = useContext(ThemeContext);

    const { loading, error, data } = useQuery(getClassPupils, {
        variables: { classId: query?.class_id }
    });
    const {
        loading: schoolClassLoading,
        error: schoolClassError,
        data: classData
    } = useQuery(getSchoolClass, {
        variables: { id: query?.class_id }
    });

    const schoolClassDetails = classData?.schoolClass;

    useEffect(() => {
        if (schoolClassError?.message) {
            callSnackbar(schoolClassError, 'error');
        }
    }, [classData, schoolClassError]);

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    useEffect(() => {
        if (data) {
            if (!data['getClassPupils']?.filter((pupil) => pupil?.mathscotUrl?.thumbnailImage?.trim())?.length) {
                setValue('allPupils');
                setClassPupils(data['getClassPupils']);
            } else {
                setClassPupils(data['getClassPupils']?.filter((pupil) => pupil?.mathscotUrl?.thumbnailImage?.trim()));
            }
        }
    }, [data]);

    const handleChange = (event) => {
        setValue(event.target.value);
        if (event.target.value === 'activePupils') {
            setClassPupils(data['getClassPupils']?.filter((pupil) => pupil?.mathscotUrl?.thumbnailImage?.trim()));
        } else {
            setClassPupils(data['getClassPupils']);
        }
    };

    if (loading || schoolClassLoading) return <CommonLoading />;

    return (
        <div data-test={'class-pupils-page'}>
            <ClassHeader schoolClassData={schoolClassDetails} />

            <CommonNavTabs
                isReading={schoolClassDetails?.IsReadingLogsEnabled}
                isFullProgramme={schoolClassDetails?.isFullProgramme}
                isRegistrationClass={schoolClassDetails?.isRegistrationClass}
                subjects={schoolClassDetails?.subjects}
                attentionRequiredPupilsCount={schoolClassDetails?.attentionRequiredPupilsCount}
                schoolClass={schoolClassDetails}
            />
            <div className="mathscot_popOver">
                <CommonPopOver bold icon="expand_more" text={'Filter'}>
                    <div className="mathscot-filter">
                        <FormControl component="fieldset">
                            <RadioGroup aria-label="gender" name="controlled-radio-buttons-group" value={value} onChange={handleChange}>
                                <FormControlLabel value="activePupils" control={<Radio />} label="Active pupils" />
                                <FormControlLabel value="allPupils" control={<Radio />} label="All pupils" />
                            </RadioGroup>
                        </FormControl>
                    </div>
                </CommonPopOver>
            </div>
            <Grid container spacing={2} classes={{ root: 'mathscots-cards-grid' }}>
                {classPupils.map((pupil, key) => {
                    let childImg = pupil?.mathscotUrl?.thumbnailImage;

                    if (!childImg && isReadyTeddyEnabledClassOnly(schoolClassDetails))
                        childImg = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/teddy.png`;

                    return (
                        <SimpleChildCard
                            dataTest={`class-pupil-card-${key}`}
                            key={key}
                            childImg={childImg || DEFAULT_EMPTY_IMAGE}
                            childName={pupil.fullname}
                            cardHandler={() =>
                                push({
                                    pathname: `/pupil/${pupil.id}`
                                })
                            }
                        />
                    );
                })}
            </Grid>
            {!loading && !classPupils?.length && (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={''}
                    heading={'No active pupils to show'}
                    subHeading={'Add a pupil to get started'}
                />
            )}
        </div>
    );
};

Mathscots.pageType = PageType.TEACHER;
Mathscots.pageTitle = 'Class: Mathscots';

export default Mathscots;
