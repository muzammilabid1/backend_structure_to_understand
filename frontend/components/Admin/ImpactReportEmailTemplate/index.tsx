import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { useContext, useEffect, useMemo } from 'react';

import { getParameterByKey } from '../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { impactReportEamilTemplateValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonLoading from '../../Shared/CommonLoading';
import EmailTemplateButton from '../../Shared/EmailTemplateButton';
import InputField from '../../Shared/InputField/InputField';
import Heading2 from '../../Shared/Typography/Heading2';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

const EMAIL_TEMPLATE_FOR_IMPACT_REPORT_KEY = 'EMAIL_TEMPLATE_FOR_IMPACT_REPORT';

const updateImpactReportEmailTemplate = gql`
    mutation updateImpactReportEmailTemplate($impactReportEmailTemplate: String!) {
        updateImpactReportEmailTemplate(impactReportEmailTemplate: $impactReportEmailTemplate) {
            key
        }
    }
`;

const EMAIL_PARAMS = ['RECIPIENT_NAME', 'TERM_NAME', 'SCHOOL_NAME', 'IMPACT_REPORT_MAGIC_LINK', 'SPM_NAME_FOR_URL', 'FIRST_NAME'];

const ImpactReportEmailTemplate = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const {
        loading: getParameterLoading,
        error: paramError,
        data
    } = useQuery(getParameterByKey, {
        variables: {
            key: EMAIL_TEMPLATE_FOR_IMPACT_REPORT_KEY
        }
    });
    const [updateImpactReportTemplate, { loading }] = useMutation(updateImpactReportEmailTemplate);

    const emailTemplate: string = useMemo(() => {
        return data?.getParameterByKey?.value ?? null;
    }, [data]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, paramError);
    }, [paramError]);

    if (getParameterLoading) return <CommonLoading />;

    return (
        <div className="school-impact-report-email-template">
            <div className="header mb10">
                <Heading2 text="Impact report email template" />
            </div>

            <Formik
                initialValues={{
                    impactReportEmailTemplate: emailTemplate
                }}
                validationSchema={impactReportEamilTemplateValidation}
                onSubmit={async (value): Promise<void> => {
                    try {
                        await updateImpactReportTemplate({
                            variables: {
                                impactReportEmailTemplate: value.impactReportEmailTemplate
                            }
                        });
                        callSnackbar('Impact report saved successfully', 'success');
                    } catch (err) {
                        handleErrorSnackbar(callSnackbar, err);
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, touched, errors }) => (
                    <div className="school-impact-report-email-template-field-container">
                        <Grid container spacing={3}>
                            <Grid item xs={12} className="school-impact-report-email-template-field-item">
                                <Paragraph>
                                    You can include parameters in any of the following fields by wrapping the desired word with
                                    &quot;&#123;&#123;&#123;&quot; and &quot;&#125;&#125;&#125;&quot;.
                                    <br />
                                    <br />
                                    The following parameters are available (click to copy):
                                </Paragraph>
                                <EmailTemplateButton list={EMAIL_PARAMS} preference="email" />
                            </Grid>
                            <Grid item xs={12} className="school-impact-report-email-template-field-item">
                                <Heading3 text="Impact report template" />
                                <InputField
                                    md={12}
                                    lg={12}
                                    label="Impact report template"
                                    value={values.impactReportEmailTemplate}
                                    name="impactReportEmailTemplate"
                                    rows={7}
                                    multiline
                                    inputComponent={'textarea'}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.impactReportEmailTemplate}
                                    touched={touched.impactReportEmailTemplate}
                                />
                            </Grid>
                            <Grid item xs={12} className="school-impact-report-email-template-field-item">
                                <LWPButton btnText="Save" loading={loading} onClick={handleSubmit} />
                            </Grid>
                        </Grid>
                    </div>
                )}
            </Formik>
        </div>
    );
};

export default ImpactReportEmailTemplate;
