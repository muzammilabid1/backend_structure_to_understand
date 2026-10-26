import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { FeatureStatus } from 'lwp-shared';
import React, { useContext } from 'react';

import { unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addFeatureValidation } from '../../../shared/validations';
import { IStaticLwpFeatures } from '../../../types/entities/IStaticLwpFeatures';
import { allFeatures } from '../../Admin/Features/Features';
import CommonCheckBox from '../CommonCheckBox';
import CommonLoading from '../CommonLoading';
import CommonMultiSelect from '../CommonMultiSelect';
import CommonSelectField from '../CommonSelectField';
import CommonTag from '../CommonTag';
import DialogWrapper from '../DialogWrapper';
import InputField from './../InputField/InputField';

const updateFeatureForUpdateFeatureModal = gql`
    mutation updateFeature($input: UpdateFeatureInput!) {
        updateFeature(input: $input)
    }
`;

const getSchoolTagsForUpdateFeatureModal = gql`
    query getSchoolTagsForAdmin {
        getSchoolTagsForAdmin {
            id
            name
            color
        }
    }
`;

interface UpdateFeatureModalProps {
    feature: IStaticLwpFeatures;
    setEditFeature: React.Dispatch<
        React.SetStateAction<{
            open: boolean;
            feature: IStaticLwpFeatures;
        }>
    >;
}

const UpdateFeatureModal = ({ feature, setEditFeature }: UpdateFeatureModalProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const { data, loading } = useQuery(getSchoolTagsForUpdateFeatureModal);
    const [updateFeatureMutation, { loading: updateFeatureLoading }] = useMutation(updateFeatureForUpdateFeatureModal, {
        refetchQueries: [{ query: allFeatures }],
        awaitRefetchQueries: true
    });

    if (loading) return <CommonLoading />;

    return (
        <Formik
            validationSchema={addFeatureValidation}
            initialValues={{
                description: feature?.description,
                status: feature?.status,
                includeSchoolsWithTags: feature?.includeSchoolsWithTags,
                schoolTags: (feature?.schoolTags || [])?.map((schoolTag) => ({
                    key: schoolTag?.id,
                    value: schoolTag?.name,
                    color: schoolTag?.color
                }))
            }}
            onSubmit={async (values) => {
                try {
                    let { description } = values;
                    const { status, schoolTags, includeSchoolsWithTags } = values;

                    description = _removeWhiteSpace(description);

                    await updateFeatureMutation({
                        variables: {
                            input: {
                                id: feature.id,
                                description,
                                status,
                                includeSchoolsWithTags,
                                schoolTagIds: schoolTags?.length > 0 ? schoolTags?.map((tag) => tag.key) : []
                            }
                        }
                    });

                    callSnackbar('Updated feature successfully!', 'success');
                    setEditFeature({ open: false, feature: null });
                } catch (error) {
                    const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                    if (statusCode) {
                        callSnackbar(error, 'error');
                    } else {
                        window.newrelic?.noticeError(error, { caught: true, handled: false });
                        callSnackbar(unexpectedError, 'error');
                    }
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <DialogWrapper
                        primaryBtnHandler={handleSubmit}
                        primaryBtnloading={updateFeatureLoading}
                        dialogFooter
                        open={true}
                        setOpen={() => setEditFeature({ open: false, feature: null })}
                        primaryBtnText={'Update'}
                        primaryBtnDisabled={updateFeatureLoading}
                        contentWidth="900px"
                        cancelBtn
                        heading={`Update ${feature?.name}`}>
                        <Grid container display="flex" flexDirection="column" spacing={2}>
                            <Grid item>
                                <CommonSelectField
                                    label="Release to"
                                    options={Object.values(FeatureStatus).map((status) => ({
                                        key: status,
                                        value:
                                            status === FeatureStatus.LIMITED_RELEASE
                                                ? 'Limited release'
                                                : status === FeatureStatus.ALL_SCHOOLS
                                                  ? 'All schools'
                                                  : 'None'
                                    }))}
                                    value={values.status}
                                    error={errors.status}
                                    touched={touched.status}
                                    md={12}
                                    lg={12}
                                    onChange={(e) =>
                                        handleChange({
                                            target: { name: 'status', value: e.target.value }
                                        })
                                    }
                                    onBlur={(e) =>
                                        handleBlur({
                                            target: { name: 'status', value: e.target.value }
                                        })
                                    }
                                    dataTest="update-feature-release-to-select"
                                />
                            </Grid>

                            {values?.status === FeatureStatus.LIMITED_RELEASE && (
                                <>
                                    <Grid item>
                                        <CommonCheckBox
                                            name="includeSchoolsWithTags"
                                            checked={values.includeSchoolsWithTags}
                                            error={errors.includeSchoolsWithTags}
                                            touched={touched.includeSchoolsWithTags}
                                            onChange={handleChange}
                                            label="Enable this feature for schools with the selected tags. Uncheck to exclude them"
                                        />
                                    </Grid>
                                    <Grid item>
                                        <CommonMultiSelect
                                            label="School tags"
                                            options={(data?.getSchoolTagsForAdmin || []).map((item) => ({
                                                value: item.name,
                                                key: item.id,
                                                ...item
                                            }))}
                                            value={values.schoolTags}
                                            error={errors.schoolTags}
                                            touched={touched.schoolTags}
                                            onChange={(value) => {
                                                handleChange({
                                                    target: { name: 'schoolTags', value: value }
                                                });
                                            }}
                                            onBlur={(value) =>
                                                handleBlur({
                                                    target: { name: 'schoolTags', value: value }
                                                })
                                            }
                                            renderTags={(value, getTagProps) =>
                                                value.map((option, index) => (
                                                    <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                                ))
                                            }
                                            md={12}
                                            lg={12}
                                            dataTest="update-feature-school-tags-select"
                                        />
                                    </Grid>
                                </>
                            )}

                            <Grid item>
                                <InputField
                                    md={12}
                                    lg={12}
                                    label="Feature description"
                                    value={values.description}
                                    name="description"
                                    rows={7}
                                    multiline
                                    inputComponent={'textarea'}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.description}
                                    touched={touched.description}
                                />
                            </Grid>
                        </Grid>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

export default UpdateFeatureModal;
