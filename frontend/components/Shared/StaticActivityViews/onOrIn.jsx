/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';
import React from 'react';

import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const OnOrIn = () => {
    const arr = [
        { key: 1, image: 'on_or_in1.png', caption: 'In' },
        { key: 2, image: 'on_or_in2.png', caption: 'Under' },
        { key: 3, image: 'on_or_in3.png', caption: 'On' },
        { key: 4, image: 'on_or_in4.png', caption: 'Behind' },
        { key: 5, image: 'on_or_in5.png', caption: 'In front' }
    ];

    return (
        <div className="on_or_in">
            <Heading1 centerText text="On or In" />

            <Divider customClass="my5" />

            <Grid container>
                {arr?.map((item) => (
                    <Grid className="card_body">
                        <img src={`/assets/images/${item?.image}`} alt={item.key} />
                        <Paragraph text={item.caption} />
                    </Grid>
                ))}
            </Grid>

            <br />

            <Paragraph>Cut out the cards from the template.</Paragraph>

            <DownloadPDFBtn url="/assets/pdf-files/OnOrIn.pdf" btnText="Card template (PDF)" />

            <Paragraph>This activity can be played inside or outside.</Paragraph>

            <br />

            <Paragraph>
                Pick a card and ask your child to place it in its corresponding position. For example, if the card were “on”, they could
                place it on top of a table. If it were “under”, they could place it under a chair.
            </Paragraph>

            <br />

            <Paragraph>Repeat the activity for all of the different cards.</Paragraph>
            <br />
        </div>
    );
};

export default OnOrIn;
