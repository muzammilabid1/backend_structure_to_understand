import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const Opposites = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday opposites">
            <Heading1 centerText text="Opposites" />
            <Divider customClass="my5" />

            <Paragraph>
                In this game, Player 1 says a{' '}
                <div className="pop_over">
                    <CommonPopOver hover text="statement" childrenClass="typography">
                        Statement: A statement sentence is the most common type of sentence. These tell the person reading a fact or idea
                        about a single topic. They usually end in a full stop (though sometimes they have exclamation marks).
                    </CommonPopOver>
                </div>{' '}
                and Player 2 replies with the opposite.
            </Paragraph>

            <br />
            <br />

            <div
                className="buble_conainer"
                style={{
                    backgroundImage: `url(${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Ellipse.png)`
                }}>
                <Heading1 customClass="sub_heading" centerText text="Example" />
                <Paragraph>Player 1: “The Queen ran into the hall.”</Paragraph>
                <Paragraph>Player 2: “The Queen tiptoed into the hall.”</Paragraph>
            </div>

            <br />
            <br />

            <Paragraph>
                Player 2 will have lots of options of what they could say, so they just need to choose one. In the example above, Player 2
                could have said, “The Queen did not run into the hall.” But they decided their statement was more interesting! <br />
                <br /> Click the button below to see a statement sentence bank if you need some more ideas to get you started.
            </Paragraph>

            <br />

            <div className="btn_container">
                <LWPButton btnText="Statement Sentence Bank" onClick={() => setOpen(true)} />
            </div>

            {open && (
                <DialogBox
                    className="finger_space_lolly_stick_dialog_box"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading={'Statement Sentence Bank'}>
                    <Paragraph>
                        The dragon roared fiercely.
                        <br /> Many tigers are hungry.
                        <br /> Cucumbers are the tastiest vegetable.
                        <br /> You should always phone Grandma on Saturday.
                        <br /> The genie will give you three wishes.
                        <br /> The princess was angry because she had lost her sword.
                        <br />
                        When fairies cry, flowers grow where their sparkly tears fall.
                        <br /> Gorillas like to eat bananas for their breakfast.
                        <br />
                        <br /> Why not make up some of your own?
                    </Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

Opposites.propTypes = { type: PropTypes.string };

export default Opposites;
