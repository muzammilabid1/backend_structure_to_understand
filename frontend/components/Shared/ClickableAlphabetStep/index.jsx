import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import DialogBox from '../StaticActivityViews/dialog';
import LWPButton from './../Button/LWPButton';
import Paragraph from './../Typography/Paragraph';

const ClickableAlphabetStep = ({ btnText, btnType, heading, text, alphabetJson }) => {
    const [open, setOpen] = useState(false);
    const [word, setWord] = useState(null);

    useEffect(() => {
        Object.keys(alphabetJson)?.length && setWord(Object.keys(alphabetJson)?.[0]);
    }, [alphabetJson]);

    return (
        <div className="activity-step-modal">
            <LWPButton color={btnType === 'SECONDARY' ? 'inherit' : 'primary'} btnText={btnText} onClick={() => setOpen(true)} />

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} className="spelling_jars_dialog " heading={heading}>
                    <Paragraph customClass="center-text">{text}</Paragraph>

                    <Paragraph customClass="bold_fonts">
                        {(Object.keys(alphabetJson) || []).sort().map((alphabet) => {
                            if (!alphabetJson?.[alphabet]?.length) return;

                            return (
                                <span
                                    className={word === alphabet ? '_span' : ''}
                                    onClick={() => setWord(alphabet)}
                                    style={{ textTransform: 'lowercase' }}>
                                    {alphabet}
                                </span>
                            );
                        })}
                    </Paragraph>

                    <div className="center-text" style={{ fontSize: 'normal', fontWeight: 'normal' }}>
                        {(alphabetJson?.[word] || [])?.map((sentences) => {
                            return (
                                <>
                                    {sentences}
                                    <br />
                                    <br />
                                </>
                            );
                        })}
                    </div>
                    {/* <Paragraph customClass="spacing_text" centerText>
                        {(alphabetJson?.[word] || [])?.map((sentences) => {

                            return (
                                <>
                                    <Paragraph style={{ textTransform: 'unset' }}>{sentences}</Paragraph>
                                    <br />
                                    <br />
                                </>
                            );
                        })}
                    </Paragraph> */}
                </DialogBox>
            )}
        </div>
    );
};

ClickableAlphabetStep.propTypes = {
    btnText: PropTypes.string,
    btnType: PropTypes.string,
    heading: PropTypes.string,
    text: PropTypes.string,
    alphabetJson: PropTypes.array
};

ClickableAlphabetStep.defaultProps = {
    btnText: 'Click Me!'
};

export default ClickableAlphabetStep;
