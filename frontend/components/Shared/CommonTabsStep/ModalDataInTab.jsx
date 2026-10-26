import { useQuery } from '@apollo/client';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { useContext } from 'react';

import { getModal } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonActivityStepPreview from '../CommonActivityStepPreview';
import CommonLoading from './../CommonLoading';

const ModalDataInTab = ({ modalId }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const {
        loading: modalDataLoading,
        error: error,
        data: modalData
    } = useQuery(getModal, {
        variables: { id: modalId }
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (modalDataLoading) return <CommonLoading />;

    return (
        <div className="modal-data-in-tab">
            <CommonActivityStepPreview steps={modalData?.getModal?.steps?.legacySteps} />
        </div>
    );
};

ModalDataInTab.propTypes = {
    modalId: PropTypes.number.isRequired
};

export default ModalDataInTab;
