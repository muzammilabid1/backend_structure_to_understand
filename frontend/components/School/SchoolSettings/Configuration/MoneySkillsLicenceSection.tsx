/* eslint-disable @next/next/no-img-element */
import { useMutation } from '@apollo/client';
import Link from 'next/link';
import { useContext } from 'react';

import { enableMoneySkillsForSchool } from '../../../../graphQl/mutations';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { getExternalResourcesLink, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchool } from '../../../../types/entities/ILwpSchool';
import LWPButton from '../../../Shared/Button/LWPButton';
import Heading1 from '../../../Shared/Typography/Heading1';
import Paragraph from '../../../Shared/Typography/Paragraph';
import { getSchoolForConfiguration } from '.';

interface MoneySkillsLicenceSectionProps {
    schoolDetails: ILwpSchool;
}

const MoneySkillsLicenceSection = ({ schoolDetails }: MoneySkillsLicenceSectionProps) => {
    const [activateMoneySkillsLicenceInSchoolMutation, { loading }] = useMutation(enableMoneySkillsForSchool);
    const { callSnackbar, token } = useContext(ThemeContext);

    const handleActivate = async () => {
        try {
            await activateMoneySkillsLicenceInSchoolMutation({
                variables: { schoolId: schoolDetails?.id },
                refetchQueries: [
                    {
                        query: getSchoolForConfiguration,
                        variables: { id: schoolDetails?.id }
                    }
                ],
                awaitRefetchQueries: true
            });

            callSnackbar('Money Skills programme activated', 'success');
        } catch (error) {
            callSnackbar(error, 'error');
        }
    };

    return (
        <div data-test="money-skills-licence-section" className="money-skills-licence-section">
            <div className="money-skills-alert">
                <span>
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/programme-mathscot-alert-image.png`}
                        alt="Money Skills Alert"
                    />
                </span>
                <Paragraph text="The Money Skills programme is now available at no extra cost" />
            </div>

            <div className="money-skills-content">
                <Heading1 text="Money Skills" />
                <Paragraph>
                    {schoolDetails?.isMoneySkillsAvailable
                        ? 'Money Skills topics are available in all classes with the Reading Log or Maths and English programme enabled.'
                        : 'Activate our Money Skills programme to set topics in any class with the Reading Log or Maths and English programme enabled.'}{' '}
                    <Link href={getExternalResourcesLink(token)} target="_blank">
                        Find out more
                    </Link>
                </Paragraph>
            </div>

            {!schoolDetails?.isMoneySkillsAvailable ? (
                <LWPButton btnText="Activate Money Skills" onClick={handleActivate} loading={loading} />
            ) : null}
        </div>
    );
};

export default MoneySkillsLicenceSection;
