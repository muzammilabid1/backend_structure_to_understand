import { useMutation } from '@apollo/client';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';

import { removePupilsFromSchool } from '../../../graphQl/mutations';
import { getSchoolPupilsWithoutMIS } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonCheckBox from '../CommonCheckBox';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

const RemoveMultiplePupilsFromThisSchoolModal = ({ open, setOpen, schoolName, pupilIds, setPupilToRemove, schoolId }) => {
    const [confirm, setConfirm] = useState(false);
    const { callSnackbar } = useContext(ThemeContext);

    const refetchQueries = [
        {
            query: getSchoolPupilsWithoutMIS,
            variables: { schoolId }
        }
    ];

    const [removePupilFromSchoolMutation, { loading: removePupilFromSchoolLoading }] = useMutation(removePupilsFromSchool, {
        refetchQueries,
        awaitRefetchQueries: true
    });

    const _onSubmit = () => {
        removePupilFromSchoolMutation({
            variables: { pupilIds }
        })
            .then(() => {
                if (setPupilToRemove) setPupilToRemove();
                setOpen();
                callSnackbar('Pupil has been removed', 'success');
            })
            .catch(({ ...err }) => {
                if (setPupilToRemove) setPupilToRemove();
                setOpen();
                callSnackbar(err, 'error');
            });
    };

    return (
        <DialogWrapper
            heading={'Remove from this school?'}
            open={open}
            setOpen={setOpen}
            dialogFooter
            cancelBtn
            contentWidth="600px"
            primaryBtnText="Remove pupil"
            primaryBtnDisabled={!confirm}
            primaryBtnloading={removePupilFromSchoolLoading}
            primaryBtnHandler={_onSubmit}>
            <Paragraph>
                Once you remove selected pupils, you will no longer be able to access their activity history or send them topics. This
                action cannot be undone, so please make sure you’re removing the right pupil.
            </Paragraph>
            <CommonCheckBox
                name="confirm"
                checked={confirm}
                error={confirm == null && 'Required *'}
                touched={true}
                onChange={() => setConfirm(!confirm)}
                label={`I confirm that I want to remove the selected pupils from ${schoolName}.`}
                className="mt4"
            />
        </DialogWrapper>
    );
};

RemoveMultiplePupilsFromThisSchoolModal.propTypes = {
    schoolName: PropTypes.string,
    open: PropTypes.bool,
    setPupilToRemove: PropTypes.bool,
    setOpen: PropTypes.func,
    pupilId: PropTypes.number,
    schoolId: PropTypes.number,
    pupilIds: PropTypes.array
};

RemoveMultiplePupilsFromThisSchoolModal.defaultProps = {
    schoolName: 'schoolName',
    open: false,
    setOpen: () => {}
};

export default RemoveMultiplePupilsFromThisSchoolModal;
