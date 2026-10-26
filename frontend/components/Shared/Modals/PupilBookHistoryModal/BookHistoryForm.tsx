/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { CircularProgress, debounce, Grid } from '@mui/material';
import { Formik } from 'formik';
import React, { useMemo, useState } from 'react';

import CommonSwitch from '../../../../components/Shared/CommonSwitch';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import InputField from '../../InputField/InputField';

type BookHistoryFormProps = {
    pupilBookHistoryMutation: any;
    pupilId: string;
    isSchoolBooksOnly: boolean;
    isCurrentYearOnly: boolean;
    setFormikValues: any;
};

const BookHistoryForm = ({
    pupilBookHistoryMutation,
    pupilId,
    isSchoolBooksOnly,
    isCurrentYearOnly,
    setFormikValues
}: BookHistoryFormProps) => {
    const [loading, setLoading] = useState(false);

    const itemData = [
        { icon: 'readingHomeIcon.svg', readAt: 'HOME' },
        { icon: 'readingSchoolIcon.svg', readAt: 'SCHOOL' },
        { icon: 'team_teacher.svg', readAt: 'GROUP' }
    ];

    return (
        <Formik
            enableReinitialize
            initialValues={{ bookName: '', isSchoolBooksOnly, isCurrentYearOnly, readAt: [] }}
            onSubmit={async (values) => {
                try {
                    setLoading(true);
                    await pupilBookHistoryMutation({
                        variables: {
                            input: {
                                pupilId: pupilId,
                                isSchoolBooksOnly: values.isSchoolBooksOnly,
                                isCurrentYearOnly: values.isCurrentYearOnly,
                                bookName: values.bookName,
                                readAt: values.readAt
                            }
                        }
                    });
                } catch (e) {
                    console.log(e);
                } finally {
                    setLoading(false);
                }
            }}>
            {({ values, setFieldValue, handleSubmit }) => {
                const debouncedHandleSubmit = useMemo(() => debounce(handleSubmit, 500), [handleSubmit]);

                useMemo(() => setFormikValues(values), [values]);

                const _onreadChanged = (item) => {
                    let readAt = values?.readAt;

                    if (!values?.readAt?.includes(item?.readAt)) {
                        readAt.push(item?.readAt);
                    } else {
                        readAt = readAt.filter((x) => x != item?.readAt);
                    }

                    if (readAt.length == 3) {
                        readAt = readAt.filter((x) => !x);
                    }

                    setFieldValue('readAt', readAt);
                    handleSubmit();
                };

                return (
                    <Grid>
                        <InputField
                            md={12}
                            lg={12}
                            value={values.bookName}
                            name="bookName"
                            startIcon="search"
                            placeholder="Search book"
                            onChange={(e) => {
                                setFieldValue('bookName', e?.target?.value);
                                debouncedHandleSubmit();
                            }}
                            endIcon={loading && <CircularProgress size={30} />}
                        />
                        <Grid gap={2} mb={2} container alignItems={'center'} justifyContent={'space-between'}>
                            <Grid display={'flex'} alignItems={'center'} gap={1}>
                                <b>Read at:</b>
                                <Grid display={'flex'} gap={1}>
                                    {itemData?.map((item) => (
                                        <div
                                            className={`read_at_book ${values?.readAt?.includes(item?.readAt) && 'read_at_active'}`}
                                            onClick={() => {
                                                _onreadChanged(item);
                                            }}>
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${item.icon}`}
                                                width={25}
                                            />
                                        </div>
                                    ))}
                                </Grid>
                            </Grid>
                            <Grid>
                                <CommonSwitch
                                    name="isSchoolBooksOnly"
                                    onClick={() => {
                                        setFieldValue('isSchoolBooksOnly', !values?.isSchoolBooksOnly);
                                        handleSubmit();
                                    }}
                                    label={'School books only'}
                                    checked={values?.isSchoolBooksOnly}
                                />

                                <CommonSwitch
                                    name="isCurrentYearOnly"
                                    onClick={() => {
                                        setFieldValue('isCurrentYearOnly', !values?.isCurrentYearOnly);
                                        handleSubmit();
                                    }}
                                    label={'Current academic year only'}
                                    checked={values?.isCurrentYearOnly}
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                );
            }}
        </Formik>
    );
};

export default BookHistoryForm;
