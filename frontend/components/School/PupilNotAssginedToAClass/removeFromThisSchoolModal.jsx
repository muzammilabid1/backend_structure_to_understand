import { useMutation } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';

import { removePupilFromSchool } from '../../../graphQl/mutations';
import { getSchoolForSchoolOverviewPage, getSchoolPupilsWithoutMIS } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonCheckBox from './../../Shared/CommonCheckBox';
import DialogWrapper from './../../Shared/DialogWrapper';
import Paragraph from './../../Shared/Typography/Paragraph';

const RemoveFromThisSchoolModal = ({ open, setOpen, pupilName, schoolName, pupilId, setPupilToRemove, schoolId, isPupilDetailsPage }) => {
    const [confirm, setConfirm] = useState(false);
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const refetchQueries = isPupilDetailsPage
        ? []
        : [
              {
                  query: getSchoolForSchoolOverviewPage,
                  variables: { id: schoolId }
              },
              {
                  query: getSchoolPupilsWithoutMIS,
                  variables: { schoolId }
              }
          ];

    const [removePupilFromSchoolMutation, { loading: removePupilFromSchoolLoading }] = useMutation(removePupilFromSchool, {
        refetchQueries,
        awaitRefetchQueries: true
    });

    const _onSubmit = () => {
        removePupilFromSchoolMutation({
            variables: { pupilId }
        })
            .then(() => {
                if (setPupilToRemove) setPupilToRemove();
                setOpen();
                callSnackbar('Pupil has been removed', 'success');
                if (isPupilDetailsPage) router?.push('/');
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
                Once you remove {pupilName}, you will no longer be able to access their activity history or send them topics. This action
                cannot be undone, so please make sure you’re removing the right pupil.
            </Paragraph>
            <CommonCheckBox
                name="confirm"
                checked={confirm}
                error={confirm == null && 'Required *'}
                touched={true}
                onChange={() => setConfirm(!confirm)}
                label={`I confirm that I want to remove ${pupilName} from ${schoolName}.`}
                className="mt4"
            />
        </DialogWrapper>
    );
};

RemoveFromThisSchoolModal.propTypes = {
    pupilName: PropTypes.string,
    schoolName: PropTypes.string,
    open: PropTypes.bool,
    isPupilDetailsPage: PropTypes.bool,
    setOpen: PropTypes.func,
    pupilId: PropTypes.number,
    schoolId: PropTypes.number,
    setPupilToRemove: PropTypes.func
};

RemoveFromThisSchoolModal.defaultProps = {
    pupilName: 'pupilName',
    schoolName: 'schoolName',
    open: false,
    isPupilDetailsPage: false,
    setOpen: () => {}
};

export default RemoveFromThisSchoolModal;
