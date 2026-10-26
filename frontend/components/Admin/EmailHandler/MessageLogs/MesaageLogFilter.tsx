import { gql, useLazyQuery, useQuery } from '@apollo/client';
import ClearIcon from '@mui/icons-material/Clear';
import { CardActions, CardContent, CircularProgress, Collapse, debounce, Grid, TextField } from '@mui/material';
import { Formik } from 'formik';
import { useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

import sharedJson from '../../../../shared/json/index.json';
import { splitCamelCaseToString } from '../../../../shared/Services/handler';
import { MessageLogsFilterValidation } from '../../../../shared/validations';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonCard from '../../../Shared/Cards/CommonCard';
import CommonMultiSelect from '../../../Shared/CommonMultiSelect';
import CommonSelectField from '../../../Shared/CommonSelectField';
import DateField from '../../../Shared/InputField/DateField';
import InputField from '../../../Shared/InputField/InputField';

const getAllEmailTemplateTypes = gql`
    query getAllEmailTemplateTypes {
        getAllEmailTemplateTypes
    }
`;

const getUsersByKey = gql`
    query getUsersByKey($key: String!) {
        getUsersByKey(key: $key) {
            email
            phoneNumber
        }
    }
`;

type MesaageLogFilterProps = {
    onFilterSearch: (values: {
        from?: Date | null;
        until?: Date | null;
        recipient?: string[] | null;
        status?: string[] | null;
        emailType?: string | null;
        messageType?: string | null;
        search?: string | null;
        open?: boolean;
    }) => void;

    input?: {
        from?: Date | null;
        until?: Date | null;
        recipient?: string[] | null;
        status?: string[] | null;
        emailType?: string | null;
        messageType?: string | null;
        search?: string | null;
        open?: boolean;
    };
};

const MesaageLogFilter = ({ onFilterSearch, input }: MesaageLogFilterProps) => {
    const searchParams = useSearchParams();

    const open = searchParams.get('open');

    const [isOpen, setIsOpen] = useState(open === 'true' ? true : false);

    const [recipientInput, setInput] = useState('');

    const { data: getAllEmailData } = useQuery(getAllEmailTemplateTypes);
    const [usersByKeyQuery, { data: usersByKeyData, loading: usersByKeyLoading }] = useLazyQuery(getUsersByKey);

    const _onReset = (resetForm) => {
        resetForm();
        onFilterSearch({
            from: null,
            until: null,
            emailType: null,
            status: null,
            recipient: null,
            messageType: null,
            search: null,
            open: isOpen
        });
    };

    const _onRecipientInputChange = (_, value) => {
        if (usersByKeyData?.getUsersByKey?.length > 0 && !value?.length) return;

        setInput(value);
        usersByKeyQuery({
            variables: {
                key: value
            }
        });
    };

    const showRecipientOptions = usersByKeyData?.getUsersByKey?.map((user) => {
        if (recipientInput.includes('+')) {
            return {
                key: user.phoneNumber,
                value: user.phoneNumber
            };
        }

        return {
            key: user.email,
            value: user.email
        };
    });

    const emailTemplateTypes = getAllEmailData?.getAllEmailTemplateTypes || [];

    const options = [
        {
            value: 'All',
            key: 'all'
        },
        ...emailTemplateTypes.map((type) => ({
            value: splitCamelCaseToString(type),
            key: type
        }))
    ];

    return (
        <Formik
            validationSchema={MessageLogsFilterValidation}
            enableReinitialize
            initialValues={{
                afterDate: input?.from,
                beforeDate: input?.until,
                recipient: input?.recipient,
                status: input?.status,
                emailType: input?.emailType,
                messageType: input?.messageType,
                search: input?.search
            }}
            onSubmit={(values) => {
                onFilterSearch({ ...values, open: isOpen, emailType: values?.emailType === 'all' ? null : values?.emailType });
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, resetForm, errors, touched }) => {
                return (
                    <>
                        <Grid container justifyContent="space-between" alignItems="center">
                            <Grid container alignItems="center" lg={6} md={6} spacing={2} style={{ gap: 20 }}>
                                <InputField
                                    label="Search"
                                    name="search"
                                    value={values.search}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    type="text"
                                    lg={8}
                                    md={8}
                                    endIcon={values?.search?.length > 0 && <ClearIcon className="cp" />}
                                    endIconHandler={() => handleChange({ target: { name: 'search', value: '' } })}
                                />

                                <Collapse in={!isOpen}>
                                    <LWPButton onClick={handleSubmit} btnText={'Apply'} />
                                </Collapse>
                            </Grid>
                            <LWPButton
                                onClick={() => setIsOpen(!isOpen)}
                                endIcon={isOpen ? 'expand_less' : 'expand_more'}
                                variant="text"
                                color="inherit"
                                btnText="Filter"
                            />
                        </Grid>
                        <Collapse className="school-collapse" in={isOpen}>
                            <br />
                            <CommonCard className={`feeds-filter-container ${isOpen ? 'show' : 'notShow'}`}>
                                <CardContent>
                                    <Grid spacing={3} container>
                                        <CommonMultiSelect
                                            label="Search by email/phone"
                                            name="recipient"
                                            options={showRecipientOptions ?? []}
                                            clearOnBlur={false}
                                            disableCloseOnSelect={true}
                                            value={values.recipient ?? []}
                                            onInputChange={debounce(_onRecipientInputChange, 500)}
                                            onChange={(value) =>
                                                handleChange({
                                                    target: { name: 'recipient', value: value }
                                                })
                                            }
                                            onBlur={(value) =>
                                                handleBlur({
                                                    target: { name: 'recipient', value: value }
                                                })
                                            }
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Search by email/phone"
                                                    InputProps={{
                                                        ...params.InputProps,
                                                        endAdornment: (
                                                            <React.Fragment>
                                                                {usersByKeyLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                                {params.InputProps.endAdornment}
                                                            </React.Fragment>
                                                        )
                                                    }}
                                                />
                                            )}
                                            md={6}
                                            lg={6}
                                        />
                                        <CommonMultiSelect
                                            label="Status"
                                            name="status"
                                            options={sharedJson?.statusOption ?? []}
                                            value={values?.status ?? []}
                                            onChange={(value) =>
                                                handleChange({
                                                    target: { name: 'status', value: value }
                                                })
                                            }
                                            onBlur={(value) =>
                                                handleBlur({
                                                    target: { name: 'status', value: value }
                                                })
                                            }
                                            md={6}
                                            lg={6}
                                        />

                                        <CommonSelectField
                                            label="Email template type"
                                            name="emailType"
                                            options={options}
                                            value={values.emailType ?? 'all'}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            md={6}
                                            lg={6}
                                        />

                                        <CommonSelectField
                                            label="Message type"
                                            name="messageType"
                                            options={[
                                                {
                                                    key: 'EMAIL',
                                                    value: 'Email'
                                                },
                                                {
                                                    key: 'SMS',
                                                    value: 'SMS'
                                                },
                                                {
                                                    key: 'BOTH',
                                                    value: 'Both'
                                                }
                                            ]}
                                            value={values.messageType}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            md={6}
                                            lg={6}
                                        />

                                        <DateField
                                            name="afterDate"
                                            label="From"
                                            md={6}
                                            lg={6}
                                            value={values.afterDate}
                                            onChange={handleChange}
                                            error={errors.afterDate}
                                            touched={touched.afterDate}
                                            disableFuture
                                            isGridRoot
                                        />

                                        <DateField
                                            name="beforeDate"
                                            label="Until"
                                            md={6}
                                            lg={6}
                                            value={values.beforeDate}
                                            onChange={handleChange}
                                            error={errors.beforeDate}
                                            touched={touched.beforeDate}
                                            disableFuture
                                            isGridRoot
                                        />
                                    </Grid>
                                </CardContent>
                                <Grid container justifyContent="end" alignItems="center">
                                    <CardActions>
                                        <LWPButton
                                            size={'large'}
                                            variant="contained"
                                            color="inherit"
                                            onClick={() => _onReset(resetForm)}
                                            btnText={'Reset'}
                                        />
                                        <LWPButton
                                            size={'large'}
                                            variant="contained"
                                            color="primary"
                                            onClick={handleSubmit}
                                            btnText={'Apply'}
                                        />
                                    </CardActions>
                                </Grid>
                            </CommonCard>
                        </Collapse>
                    </>
                );
            }}
        </Formik>
    );
};

export default MesaageLogFilter;
