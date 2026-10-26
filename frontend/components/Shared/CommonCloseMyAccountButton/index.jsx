import { useMutation } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import React, { useContext, useState } from 'react';

import { deleteUser } from '../../../graphQl/mutations';
import { clearCookies } from '../../../lib/manageCookies';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import ConfirmationModal from './../Modals/ConfirmationModal';
import Heading1 from './../Typography/Heading1';
import Paragraph from './../Typography/Paragraph';

const CommonCloseMyAccountButton = () => {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { callSnackbar, token, setToken } = useContext(ThemeContext);

    const [deleteUserMutation, { loading: deleteUserLoading }] = useMutation(deleteUser);

    return (
        <div className="delete-acount-btn">
            <Heading1 text="﻿﻿Account closure" customClass="mt16 pb8 account-settings-heading" />
            <Paragraph text="﻿﻿No longer using Learning with Parents? Use the button below to permanently close your account." />
            <LWPButton startIcon="delete" customClass="mt5" btnText="Close my account" onClick={() => setOpen(!open)} />
            <ConfirmationModal
                open={open}
                onCancel={() => setOpen(!open)}
                loading={deleteUserLoading}
                heading="Close my account"
                mainText="This will close your account and you will no longer be able to log into the site. Are you sure you want to go ahead?"
                checkboxLabel=" I understand I will lose access to Learning with Parents when I close this account"
                btnText="Continue"
                onConfirm={() => {
                    deleteUserMutation({
                        variables: {
                            id: token?.sub
                        }
                    })
                        .then(() => {
                            callSnackbar('Account closed successfully.', 'success');
                            setOpen(false);
                            clearCookies(router?.push, setToken);
                        })
                        .catch(({ ...err }) => {
                            callSnackbar(err, 'error');
                            setOpen(false);
                        });
                }}
            />
        </div>
    );
};

export default CommonCloseMyAccountButton;
