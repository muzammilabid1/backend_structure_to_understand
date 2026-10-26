/* eslint-disable @next/next/no-img-element */
import { useMutation } from '@apollo/client';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { ADMIN, DEFAULT_EMPTY_IMAGE, MAGICPARENT, PARENT, TOPICACCESS } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import LWPButton from './../../components/Shared/Button/LWPButton';
import CommonLoading from './../../components/Shared/CommonLoading';
import Heading2 from './../../components/Shared/Typography/Heading2';
import Paragraph from './../../components/Shared/Typography/Paragraph';

// Mutations

const generateMathscotChoicesForChangeDress = gql`
    mutation generateMathscotChoices($input: MathscotChoicesInput!) {
        generateMathscotChoices(input: $input) {
            adultMathscot
            mergedItems {
                id
                mergedUrl {
                    itemIds
                    bigImage
                    thumbnailImage
                }
            }
        }
    }
`;

const ChangeDress = ({ pupilActivity, saveMathscot, selectedMathscot, setSelectedMathscot, setOrder, mergeMathscotItemsLoader }) => {
    const [dressChoices, setDressChoices] = useState({});
    const [adultMathscot, setAdultMathscot] = useState(DEFAULT_EMPTY_IMAGE);

    const { callSnackbar, token } = useContext(ThemeContext);

    const [generateMathscotChoicesMutation, { loading }] = useMutation(generateMathscotChoicesForChangeDress);

    const isAllowedToGenerateMathscot = () => [PARENT, MAGICPARENT, TOPICACCESS, ADMIN].includes(token?.userType);

    const preloadImages = [];

    useEffect(() => {
        if (isAllowedToGenerateMathscot()) {
            generateMathscotChoicesMutation({
                variables: {
                    input: {
                        pupilId: pupilActivity?.pupil?.id,
                        itemIds: pupilActivity.mathscotActivityItemIds,
                        character: pupilActivity?.pupil?.currentMathscot?.character ?? 'MONKEY',
                        colour: pupilActivity?.pupil?.currentMathscot?.colour ?? 'NATURAL'
                    }
                }
            })
                .then(({ data }) => {
                    setDressChoices(data['generateMathscotChoices']);
                    setAdultMathscot(data['generateMathscotChoices']?.adultMathscot);
                    // Preload images: something about <Head> didn't like <link rel="preload"> being added for them.
                    data['generateMathscotChoices']?.mergedItems?.map((item) => {
                        const img = new Image();

                        img.src = item?.mergedUrl?.bigImage;
                        preloadImages.push(img);
                    });
                })
                .catch(({ ...err }) => {
                    callSnackbar(err, 'error');
                });
        }
    }, [pupilActivity?.pupil?.id, pupilActivity.mathscotActivityItemIds]);

    if (loading) return <CommonLoading />;

    // if mathscot not generated then return ? component

    return (
        <div className="change-dress-container">
            <Heading2 text="Dress your Mathscot" />
            <Paragraph text="Enter a comment or upload a photo to choose your new item!" />
            <>
                {!selectedMathscot && <img src={adultMathscot} alt="" className="child-img" />}
                {selectedMathscot && <img src={selectedMathscot?.mergedUrl?.bigImage} alt="" className="child-img" />}
                <div className="dress-img-container">
                    {dressChoices?.mergedItems?.map((item, key) => (
                        <div
                            className="dress-container popup"
                            key={key}
                            onClick={() => {
                                setSelectedMathscot(item);
                                setOrder(key);
                            }}>
                            <img src={item?.mergedUrl?.thumbnailImage} alt="dress img" className="dress-img" />
                        </div>
                    ))}
                </div>
            </>

            <LWPButton btnText="Save and close" onClick={saveMathscot} loading={mergeMathscotItemsLoader} />
        </div>
    );
};

ChangeDress.propTypes = {
    pupilActivity: PropTypes.string,
    saveMathscot: PropTypes.func,
    mergeMathscotItemsLoader: PropTypes.bool,
    setOrder: PropTypes.func,
    setSelectedMathscot: PropTypes.func,
    selectedMathscot: PropTypes.object
};

export default ChangeDress;
