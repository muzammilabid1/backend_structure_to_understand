import { CardActions, Collapse, Grid } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React from 'react';

import LWPButton from '../../Shared/Button/LWPButton';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import InputField from '../../Shared/InputField/InputField';

const FilterDomain = ({ open, yearGroups, subjects }) => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const search = searchParams.get('search');
    const subject = searchParams.get('subject');
    const year = searchParams.get('year');

    const _onReset = (resetForm) => {
        resetForm({
            values: {}
        });

        router?.push({
            pathname: `/admin/domains`,
            query: {
                IsOpen: true
            }
        });
    };

    return (
        <Collapse style={{ maxWidth: '750px', margin: 'auto', marginBottom: 24 }} in={open?.isFilterOpen}>
            <Formik
                initialValues={{
                    year: year?.length ? JSON.parse(year) : [],
                    subject: subject ? JSON.parse(subject) : [],
                    search: search ? search : ''
                }}
                onSubmit={(values) => {
                    const { search, year, subject } = values;

                    router?.push({
                        pathname: `/admin/domains`,
                        query: {
                            IsOpen: true,
                            search: search,
                            year: JSON.stringify(year),
                            subject: JSON.stringify(subject)
                        }
                    });
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched, resetForm }) => {
                    return (
                        <CommonCard>
                            <Grid container spacing={3}>
                                <CommonMultiSelect
                                    md={6}
                                    lg={6}
                                    name="year"
                                    label="Year group"
                                    value={values.year}
                                    displayEmpty
                                    shrink={values.year}
                                    filterSelectedOptions={false}
                                    options={(yearGroups?.allYearGroup || []).map((item) => ({ value: item.year, key: item.id }))}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'year', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'year', value: value }
                                        })
                                    }
                                />
                                <CommonMultiSelect
                                    md={6}
                                    lg={6}
                                    name="subject"
                                    label="Subject"
                                    value={values.subject}
                                    displayEmpty
                                    shrink={values.subject}
                                    filterSelectedOptions={false}
                                    options={(subjects || []).map((item) => ({ value: item.name, key: item.id }))}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'subject', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'subject', value: value }
                                        })
                                    }
                                />

                                <InputField
                                    value={values?.search}
                                    startIcon={<span className="material-icons">search</span>}
                                    placeholder="Search"
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors?.search}
                                    touched={touched?.search}
                                    name={'search'}
                                    xs={12}
                                    sm={12}
                                    md={6}
                                    lg={6}
                                />
                            </Grid>

                            <CardActions>
                                <LWPButton
                                    size={'large'}
                                    variant="contained"
                                    color="inherit"
                                    onClick={() => _onReset(resetForm)}
                                    btnText={'Reset'}
                                />
                                <LWPButton size={'large'} variant="contained" color="primary" onClick={handleSubmit} btnText={'Apply'} />
                            </CardActions>
                        </CommonCard>
                    );
                }}
            </Formik>
        </Collapse>
    );
};

FilterDomain.propTypes = {
    open: PropTypes.bool.isRequired,
    yearGroups: PropTypes.object,
    subjects: PropTypes.array
};

FilterDomain.defaultProps = {
    open: false
};

export default FilterDomain;
