import { useQuery } from '@apollo/client';
import gql from 'graphql-tag';
import Link from 'next/link';
import React, { useContext, useEffect } from 'react';

import NameValue from '../../components/Shared/NameValue';
import Heading1 from '../../components/Shared/Typography/Heading1';
import Heading2 from '../../components/Shared/Typography/Heading2';
import Paragraph from '../../components/Shared/Typography/Paragraph';
import { getParameters } from '../../graphQl/queries';
import { ThemeContext } from '../../shared/Services/handler';
import { PageType } from '../../types/enums/PageType';

// Queries

const getBeforeLoginFAQs = gql`
    query getBeforeLoginFAQs {
        getBeforeLoginFAQs {
            id
            answer
            question
        }
    }
`;

const ParentFaqs = () => {
    const { setHeaderTitle, callSnackbar } = useContext(ThemeContext);
    const { error, data: faqs } = useQuery(getBeforeLoginFAQs);

    const { data: getParametersData } = useQuery(getParameters, {
        variables: { keys: ['PARENT_SUPPORT_EMAIL', 'GENERAL_SUPPORT_PHONE_NUMBER'] }
    });
    const [generalSupportEmail, generalSupportPhoneNumber] = getParametersData?.getParameters ?? [];

    useEffect(() => setHeaderTitle('FAQs'), []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    return (
        <>
            <Heading1 text="Frequently Asked Questions" centerText customClass="main-heading" />
            {(faqs?.getBeforeLoginFAQs || []).map((faq) => (
                <NameValue
                    key={faq.id}
                    primaryText={faq.question}
                    headingClass={'paragraph-bold'}
                    secondaryText={faq.answer}
                    customClass="mb12"
                />
            ))}

            <div className="mt14 contact-container">
                <Heading2 text={'Contact us'} />
                <Paragraph>
                    If you need help with something, you can email us at{' '}
                    <Link passHref href={`mailto:${generalSupportEmail?.value}`}>
                        {generalSupportEmail?.value}
                    </Link>{' '}
                    or phone us on <b>{generalSupportPhoneNumber?.value}</b>.
                </Paragraph>
            </div>
        </>
    );
};

ParentFaqs.pageType = PageType.GENERAL;
ParentFaqs.pageTitle = 'FAQs';

export default ParentFaqs;
