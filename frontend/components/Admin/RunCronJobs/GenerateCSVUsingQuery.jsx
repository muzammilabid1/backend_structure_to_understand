import { useLazyQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import React, { useContext, useEffect } from 'react';

import { getCsvFromQuery } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import { generateCsvValidation } from '../../../shared/validations';
import LWPButton from './../../Shared/Button/LWPButton';
import InputField from './../../Shared/InputField/InputField';
import Heading2 from './../../Shared/Typography/Heading2';

const GenerateCSVUsingQuery = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [getCsvFromQueryQuery, { loading, error, data: csvString }] = useLazyQuery(getCsvFromQuery);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (csvString?.getCsvFromQuery) {
            window.location.href = csvString?.getCsvFromQuery;
        }
    }, [csvString]);

    return (
        <div className="generate-csv-container">
            <Heading2 text="Generate CSV" />
            <Formik
                initialValues={{
                    query: null
                }}
                enableReinitialize
                validationSchema={generateCsvValidation}
                onSubmit={(values, { resetForm }) => {
                    getCsvFromQueryQuery({ variables: { query: values?.query } });
                    resetForm({ values: { query: null } });
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                    <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                        <InputField
                            name={'query'}
                            value={values.query}
                            onChange={handleChange}
                            inputComponent={'textarea'}
                            onBlur={handleBlur}
                            error={errors.query}
                            touched={touched.query}
                            label="Query"
                            md={12}
                            lg={12}
                        />

                        <LWPButton btnText={'Generate'} loading={loading} disabled={loading} onClick={handleSubmit} />
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default GenerateCSVUsingQuery;
