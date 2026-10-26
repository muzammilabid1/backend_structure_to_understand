/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { DEFAULT_EMPTY_IMAGE } from '../../../shared/Constant';
import MobileImgStepper from '../../Parent/MobileImgStepper';
import Paragraph from '../../Shared/Typography/Paragraph';

const MathScoteWithTrophy = ({ images, pupilHome }) => {
    return (
        <div className="mathScote-with-trophy">
            <div className="mathscot-not-available">
                {pupilHome && images.length && images.every((img) => img.imgPath === DEFAULT_EMPTY_IMAGE) && (
                    <Paragraph text={"You don't currently have a mathscot. Complete your first activity to pick your mathscot"} />
                )}
            </div>
            <div className="head">
                {(images || []).map((img, key) => {
                    if (img.imgPath == '') return;

                    return (
                        <span key={key}>
                            <img src={img.imgPath} alt="center img" className={`child-img`} />
                        </span>
                    );
                })}
            </div>
            <div className="mobile-steper-show">
                <MobileImgStepper sliderImg={images} />
            </div>
        </div>
    );
};

MathScoteWithTrophy.propTypes = { images: PropTypes.array, pupilHome: PropTypes.bool };

MathScoteWithTrophy.defaultProps = {
    pupilHome: false
};

export default MathScoteWithTrophy;
