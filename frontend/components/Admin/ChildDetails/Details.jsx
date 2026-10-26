import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useCallback, useContext, useState } from 'react';
import { useEffect } from 'react';

import { getPupilForAdminPupilView } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import PupilDetails from '../../School/ChildDetails/PupilDetails';
import CommonLoading from './../../Shared/CommonLoading';
import CommonPupilTrophies from './../../Shared/CommonPupilTrophies';
import Heading1 from '../../Shared/Typography/Heading1';
import LWPButton from '../../Shared/Button/LWPButton';

import styles from './Details.module.scss';
import { useRouter } from 'next/router';

const PupilDetailsAdmin = ({ setChildName, setSchoolId }) => {
    const router = useRouter();

    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();

    const {
        loading,
        error,
        data: pupil
    } = useQuery(getPupilForAdminPupilView, {
        variables: { id: queryParams?.child_id }
    });

    useEffect(() => {
        if (pupil) {
            setChildName(`${pupil?.pupil?.firstname} ${pupil?.pupil?.lastname}`);
            setSchoolId(pupil?.pupil?.school?.id);
        }
    }, [pupil]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    return (
        <>
            <PupilDetails isAdminView pupil={pupil} />
            <CommonPupilTrophies
                child_id={pupil?.pupil?.id}
                pupilTrophies={pupil?.pupil?.trophies}
                class_id={pupil?.pupil?.currentClassOrGroupAcrossClasses?.id}
            />
            <div className={styles.mergePupilsContainer}>
                <Heading1 text="Merge this pupil with another pupil" />
                <LWPButton
                    customClass={styles.toggleMergePupilsModalButton}
                    btnText="Merge pupils"
                    onClick={() => router.push(`/admin/child/${pupil?.pupil?.id}/merge`)}
                />
            </div>
        </>
    );
};

PupilDetailsAdmin.propTypes = { setChildName: PropTypes.func, setSchoolId: PropTypes.func };

export default PupilDetailsAdmin;
