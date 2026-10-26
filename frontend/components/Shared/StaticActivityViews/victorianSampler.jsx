/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import LWPButton from '../Button/LWPButton';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import DownloadAlphabetsPDF from '../downloadAlphabetsPDF';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const VictorianSampler = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday improveIt">
            <Heading1 centerText text="Victorian Sampler" />
            <Divider customClass="my5" />
            <Paragraph>
                In this activity, you will be making a Victorian-style letter and number sampler. Children used to sew samplers to show off
                their needlework skills. Don’t worry though, this activity doesn’t involve sewing (unless you’re really keen) – it’s a
                chance to show off your beautiful handwriting instead!
            </Paragraph>
            <div className="img_container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/sampler.png`} alt="sampler" />
            </div>
            <Divider customClass="mt5 mb10" />
            <Heading1 customClass="sub_heading" centerText text="You will need" />

            <br />
            <br />

            <ol>
                <li>
                    Sampler template (or use the template to draw your own on a plain piece of paper. Click the button below to view the
                    template.)
                </li>
            </ol>

            <DownloadPDFBtn btnText="Sampler template (PDF)" color="primary" url="/assets/pdf-files/VictorianSampler.pdf" />

            <ol>
                <li className="hidden_item" />
                <li>A sharp pencil (or a pen you can write really neatly with)</li>
                <li>You might also want to remind yourself of the letter formation instructions by clicking the button below.</li>
            </ol>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Letter formation instructions" color="inherit" />
            </div>

            <Divider customClass="mt5 mb10" />

            <Heading1 customClass="sub_heading" centerText text="What to do" />

            <br />
            <br />

            <ol>
                <li>
                    Start by checking you know which space you are leaving empty for the border. Don’t write anything in this space until
                    the end!
                </li>
                <li>
                    At the left end of the top line, write an{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="upper-case">
                            Upper-case letters: Also known as capital letters, e.g. B Q or M.
                        </CommonPopOver>
                    </div>{' '}
                    A.
                </li>
                <li>
                    Next to A, without a space, write a{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="lower-case">
                            Lower-case letters: Also known as little letters, e.g. b q or m.
                        </CommonPopOver>
                    </div>{' '}
                    a.
                </li>
                <li>Leave a space (about the same size you would write a letter m).</li>

                <li>Write Bb.</li>
                <li>Keep going through the alphabet (going onto a new line whenever you need to) until you have written Zz.</li>
                <li>Write the digits 0-9.</li>
                <li>
                    If you have any space left, you could fill the space by repeating the alphabet or carefully drawing a picture. Victorian
                    children also used to put their name and the date in their sampler. Sometimes they even included a short poem or verse
                    from a longer poem (you could copy some lines from your favourite poem).
                </li>
                <li>Decorate your border. There are some ideas in the image below.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/victorian_sampler.png`}
                    alt="sampler"
                />
            </div>

            <br />

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="Letter Formation">
                    <DownloadAlphabetsPDF
                        array={[...sharedJson.alphabets, { text: <br /> }].concat(
                            sharedJson?.alphabets.map((i) => ({ text: i.text.toUpperCase() }))
                        )}
                    />
                </DialogBox>
            )}
        </div>
    );
};

VictorianSampler.propTypes = { type: PropTypes.string };

export default VictorianSampler;
