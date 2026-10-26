/* eslint-disable @next/next/no-img-element */
import { useLazyQuery, useQuery } from '@apollo/client';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { PupilType } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import Heading1 from '../Typography/Heading1';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonLoading from './../../Shared/CommonLoading';
import CommonStatus from './../../Shared/CommonStatus';
import DialogWrapper from './../../Shared/DialogWrapper';
import AwardTrophy from './../../Shared/Modals/AwardTrophy';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

// Queries

const getPupilTrophiesForPupilTrophies = gql`
    query getPupilTrophies($pupilId: String!, $parentId: String) {
        getPupilTrophies(pupilId: $pupilId, parentId: $parentId) {
            id
            pupil {
                id
            }
            schoolClass {
                id
            }
            trophy {
                id
                title
                logo
                certificatePdf
            }
        }
    }
`;

const getPupilPreviousMathscotsForPupilTrophies = gql`
    query getPupilPreviousMathscots($pupilId: String!) {
        getPupilPreviousMathscots(pupilId: $pupilId) {
            period
            thumbnailImage
            bigImage
        }
    }
`;

const generatePupilCertificateForPupilTrophies = gql`
    query generatePupilCertificate($pupilId: String!, $schoolClassId: String, $trophyId: String!) {
        generatePupilCertificate(pupilId: $pupilId, schoolClassId: $schoolClassId, trophyId: $trophyId)
    }
`;

const PupilTrophies = ({ pupilId, parentId, isTeacherView, type, isCurrentClass }) => {
    const [open, setOpen] = useState(false);
    const [openTrophy, setOpenTrophy] = useState(false);
    const [openAwardTrophy, setOpenAwardTrophy] = useState(false);
    const [selectedPupilMathscot, setSelectedPupilMathscot] = useState(null);
    const [selectedTrophy, setSelectedTrophy] = useState(null);
    const { callSnackbar } = useContext(ThemeContext);

    const { error: error, data: pupilTrophies, loading } = useQuery(getPupilTrophiesForPupilTrophies, { variables: { pupilId, parentId } });

    const {
        error: PupilPreviousMathscotsError,
        data: PupilPreviousMathscots,
        loading: PupilPreviousMathscotsLoading
    } = useQuery(getPupilPreviousMathscotsForPupilTrophies, { variables: { pupilId } });

    const [pupilCertificateQuery, { loading: generatePupilCertificateLoading, error: pupilCertificateError, data: pupilCertificate }] =
        useLazyQuery(generatePupilCertificateForPupilTrophies, {
            fetchPolicy: 'network-only'
        });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (pupilCertificate?.generatePupilCertificate) {
            setOpenTrophy(!openTrophy);
            window.location.href = pupilCertificate?.generatePupilCertificate;
        }
    }, [pupilCertificate]);

    useEffect(() => {
        pupilCertificateError?.message && callSnackbar(pupilCertificateError, 'error');
    }, [pupilCertificateError]);

    useEffect(() => {
        PupilPreviousMathscotsError?.message && callSnackbar(PupilPreviousMathscotsError, 'error');
    }, [PupilPreviousMathscotsError]);

    const onImageClick = (selectedPupilMathscot) => {
        setSelectedPupilMathscot(selectedPupilMathscot);
        setOpen(!open);
    };

    const onTrophyClick = (selectedTrophy) => {
        setSelectedTrophy(selectedTrophy);
        setOpenTrophy(!openTrophy);
    };

    if (loading || PupilPreviousMathscotsLoading) return <CommonLoading />;

    return (
        <div className="achivement_bar" data-test={'pupil-trophies-section'}>
            {!pupilTrophies?.getPupilTrophies?.length && !PupilPreviousMathscots?.['getPupilPreviousMathscots']?.length ? (
                <CommonStatus
                    className="status_bar"
                    heading="No trophies yet"
                    subHeading={
                        isCurrentClass
                            ? isTeacherView || type === PupilType.READING
                                ? 'This pupil has not earned any trophies yet'
                                : 'If you complete enough activities, you will earn a new trophy at the end of the term.'
                            : ''
                    }
                />
            ) : (
                <>
                    <Heading1 text="My trophies" centerText />
                    <div className="achivement_pupil_mathscot_cards">
                        <div>
                            {pupilTrophies?.getPupilTrophies.map((achivement, idx) => (
                                <div key={idx} className="achivement_card">
                                    <img
                                        src={achivement?.trophy?.logo}
                                        onClick={() => onTrophyClick(achivement)}
                                        alt={`${achivement?.trophy?.title} badge`}
                                    />
                                    <Paragraph>{achivement?.trophy?.title}</Paragraph>
                                </div>
                            ))}
                        </div>
                        <div>
                            {(PupilPreviousMathscots?.['getPupilPreviousMathscots'] || []).map((pupilMathscot, idx) => (
                                <div key={idx} className="pupil_mathscot_card">
                                    <img
                                        src={pupilMathscot?.thumbnailImage}
                                        onClick={() => onImageClick(pupilMathscot)}
                                        alt={'pupil_mathscot'}
                                    />
                                    <Paragraph>{`My Mathscot for the ${pupilMathscot?.period} school year.`}</Paragraph>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
            {isTeacherView && (
                <div className="pupil-trophies-assign-container">
                    <Heading2 text="Award a trophy" />
                    <Paragraph text="If you want to award a trophy to a pupil who has not met the criteria automatically, please use the button below." />
                    <div className="pupil-trophies-assign-button">
                        <LWPButton btnText="Select the trophy" onClick={() => setOpenAwardTrophy(!openAwardTrophy)} />
                    </div>
                </div>
            )}
            {open && (
                <DialogWrapper className="pupil_mathscot_modal" contentWidth="570px" open={open} setOpen={() => setOpen(!open)}>
                    <div className="pupil_mathscot_modal_image">
                        <img src={selectedPupilMathscot?.bigImage} alt={'pupil_mathscot_big_image'} />
                    </div>
                    <Paragraph customClass="pt2 para">My Mathscot for the {selectedPupilMathscot?.period} school year.</Paragraph>
                </DialogWrapper>
            )}
            {openTrophy && (
                <DialogWrapper
                    className="pupil-trophy-certificate"
                    contentWidth="570px"
                    open={openTrophy}
                    setOpen={() => setOpenTrophy(!openTrophy)}>
                    <div className="pupil-trophy-image">
                        <img src={selectedTrophy?.trophy?.logo} alt={'pupil trophy badge'} />
                    </div>
                    <Paragraph customClass="pt2 para">{selectedTrophy?.trophy?.title}</Paragraph>
                    <div className="pupil-trophy-certificate-button">
                        <LWPButton
                            btnText="Download Certificate"
                            loading={generatePupilCertificateLoading}
                            onClick={() => {
                                pupilCertificateQuery({
                                    variables: {
                                        trophyId: selectedTrophy?.trophy?.id,
                                        schoolClassId: selectedTrophy?.schoolClass?.id,
                                        pupilId: selectedTrophy?.pupil?.id
                                    }
                                });
                            }}
                        />
                    </div>
                </DialogWrapper>
            )}
            {openAwardTrophy && <AwardTrophy open={openAwardTrophy} setOpen={setOpenAwardTrophy} child_id={pupilId} />}
        </div>
    );
};

PupilTrophies.propTypes = {
    pupilId: PropTypes.number.isRequired,
    parentId: PropTypes.number,
    isTeacherView: PropTypes.bool,
    type: PropTypes.string,
    isCurrentClass: PropTypes.bool
};

PupilTrophies.defaultProps = {
    parentId: null,
    isTeacherView: false,
    isCurrentClass: true
};

export default PupilTrophies;
