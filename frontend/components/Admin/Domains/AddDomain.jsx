import { gql, useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { ThemeContext } from '../../../shared/Services/handler';
import { addDomainFromAdminValidation } from '../../../shared/validations';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import CommonSelectField from '../../Shared/CommonSelectField';
import DialogWrapper from '../../Shared/DialogWrapper';
import InputField from '../../Shared/InputField/InputField';

const addTopicDomain = gql`
    mutation addTopicDomain($input: TopicDomainInput!) {
        addTopicDomain(input: $input) {
            id
        }
    }
`;

const updateTopicDomain = gql`
    mutation updateTopicDomain($input: UpdateTopicDomainInput!) {
        updateTopicDomain(input: $input) {
            id
        }
    }
`;

const AddDomain = ({ open, setOpen, yearGroups, subjects, getDomainsForDomainsOverview, variablesInQuery }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [addUpdateDomainMutation, { loading }] = useMutation(open?.isEdit ? updateTopicDomain : addTopicDomain, {
        refetchQueries: [{ query: getDomainsForDomainsOverview, variables: variablesInQuery }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            enableReinitialize
            initialValues={{
                name: open?.isEdit ? open?.item?.title : '',
                year: open?.isEdit ? open?.item?.yearGroups?.map((value) => ({ value: value?.year, id: value?.id })) : [],
                subject: open?.isEdit ? open?.item?.subject?.id : ''
            }}
            validationSchema={addDomainFromAdminValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    await addUpdateDomainMutation({
                        variables: {
                            input: {
                                title: values.name,
                                subjectId: values.subject,
                                yearGroupIds: values.year?.map((value) => value.id),
                                id: open?.item?.id
                            }
                        }
                    });
                    setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen }));
                    resetForm({ values: '' });
                    callSnackbar(open?.isEdit ? 'Edit domain successfully' : 'New domain created', 'success');
                } catch (error) {
                    callSnackbar(error, 'error');
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <DialogWrapper
                        primaryBtnHandler={handleSubmit}
                        primaryBtnloading={loading}
                        dialogFooter
                        open={open?.AddDomain || open?.isEdit}
                        contentWidth="750px"
                        heading={open?.isEdit ? 'Edit domain' : 'Add a domain'}
                        primaryBtnText={open?.isEdit ? 'Edit' : 'Add'}
                        onClose={() => setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen }))}
                        setOpen={() => setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen }))}
                        cancelBtn>
                        <InputField
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.name}
                            touched={touched.name}
                            label="Domain name"
                            type="text"
                            md={12}
                            lg={12}
                        />

                        <CommonMultiSelect
                            name="year"
                            label="Year group"
                            value={values.year}
                            displayEmpty
                            error={errors.year}
                            touched={touched.year}
                            shrink={values.year}
                            filterSelectedOptions={false}
                            options={(yearGroups?.allYearGroup || []).map((item) => ({ value: item.year, id: item.id }))}
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
                            dataTest="add-domain-year-group-multi-select"
                        />

                        <CommonSelectField
                            md={12}
                            lg={12}
                            displayEmpty
                            shrink={values.subject}
                            error={errors.subject}
                            touched={touched.subject}
                            value={values.subject}
                            name="subject"
                            label="Subject"
                            options={subjects.map((item) => ({ value: item?.name, key: item?.id }))}
                            onChange={(e) => {
                                handleChange({
                                    target: { name: 'subject', value: e.target.value }
                                });
                            }}
                            dataTest="add-domain-subject-select"
                        />
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

AddDomain.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    yearGroups: PropTypes.object,
    subjects: PropTypes.array,
    variablesInQuery: PropTypes.object,
    getDomainsForDomainsOverview: PropTypes.func
};

AddDomain.defaultProps = {
    open: false,
    setOpen: () => {}
};

export default AddDomain;
