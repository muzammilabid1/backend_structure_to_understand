/* eslint-disable @next/next/no-img-element */
import { useMutation } from '@apollo/client';
import { useContext } from 'react';

import { enableMoneySkillsForSchool } from '../../../graphQl/mutations';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import DialogWrapper from '../DialogWrapper';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

interface ActivateMoneySkillsLicenceModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onMoneySkillsActivated: () => void;
    schoolId: string;
}

const ActivateMoneySkillsLicenceModal = ({ isOpen, setIsOpen, onMoneySkillsActivated, schoolId }: ActivateMoneySkillsLicenceModalProps) => {
    const [activateMoneySkillsLicenceInSchoolMutation, { loading }] = useMutation(enableMoneySkillsForSchool);
    const { callSnackbar } = useContext(ThemeContext);

    const handleActivate = async () => {
        try {
            await activateMoneySkillsLicenceInSchoolMutation({ variables: { schoolId } });
            callSnackbar('Money Skills programme activated for the whole school', 'success');

            onMoneySkillsActivated();
        } catch (error) {
            callSnackbar(error, 'error');
        }
    };

    const handleClose = () => {
        if (!loading) setIsOpen(false);
    };

    return (
        <DialogWrapper open={isOpen} className="activate-money-skills-modal" onClose={handleClose} contentWidth="895px">
            <div className="activate-money-skills-modal-content">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/koala-with-yellow-background.png`}
                    alt="Koala with yellow background"
                />
                <div className="activate-money-skills-modal-text">
                    <Heading1 text="Money Skills programme" />
                    <Paragraph text={'The Money Skills programme can now be activated for the whole school at no extra cost.'} />
                </div>
                <div className="activate-money-skills-modal-buttons">
                    <LWPButton btnText="Close" color="inherit" onClick={handleClose} disabled={loading} />
                    <LWPButton btnText="Activate for the whole school" onClick={handleActivate} loading={loading} />
                </div>
            </div>
        </DialogWrapper>
    );
};

export default ActivateMoneySkillsLicenceModal;
