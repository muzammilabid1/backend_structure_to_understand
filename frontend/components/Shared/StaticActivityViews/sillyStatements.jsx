/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const SillyStatements = () => {
    return (
        <div className="happy_birthday">
            <Heading1 centerText text="Silly Statements" />
            <Divider customClass="my5" />

            <Paragraph>
                A{' '}
                <div className="pop_over">
                    <CommonPopOver hover childrenClass="typography" text="statement">
                        Statement: A statement sentence is the most common type of sentence. These tell the person reading a fact or idea
                        about a single topic. They usually end in a full stop (though sometimes they have exclamation marks).
                    </CommonPopOver>
                </div>{' '}
                sentence is the most common type of sentence. These tell the person reading a fact or idea about a single topic. They
                usually end in a full stop (though sometimes they have exclamation marks).
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="The Activity" />
            <br />
            <br />

            <Paragraph>
                Build a sentence by taking it in turns to say a word. If you think the sentence is finished, say “Full stop” instead of
                another word.
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Example" />
            <br />
            <br />

            <Paragraph>
                <ul>
                    <li>
                        I <span className="_span">went</span> for a walk in the <span className="_span">park</span> “full stop”
                    </li>
                    <li>
                        Cows <span className="_span">produce</span> milk <span className="_span">for</span> people{' '}
                        <span className="_span">to</span> drink <span className="_span">“full stop”</span>
                    </li>
                    <li>
                        For <span className="_span">breakfast</span>, I am going <span className="_span">to</span> eat{' '}
                        <span className="_span">cereal</span> followed <span className="_span">by</span> a{' '}
                        <span className="_span">piece</span> of <span className="_span">toast</span> “full stop”
                    </li>
                    <li>
                        Wednesday <span className="_span">is</span> a <span className="_span">funny</span> day{' '}
                        <span className="_span">because</span> of <span className="_span">all</span> the{' '}
                        <span className="_span">alien</span> jokes <span className="_span">“full stop”</span>
                    </li>
                </ul>
                It’s ok if your sentences end up being silly!
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/silly_statement.png`}
                    alt="silly statement"
                />
            </div>
            <br />
            <br />
        </div>
    );
};

SillyStatements.propTypes = { subject: PropTypes.string };

export default SillyStatements;
