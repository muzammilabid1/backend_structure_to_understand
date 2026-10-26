/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const MyCafe = () => {
    return (
        <div className="happy_birthday">
            <Heading1 centerText text="My Café" />

            <Divider customClass="my5" />

            <Paragraph>
                Turn your house into a pretend café! It can be fun to do this for a real meal you were already going to have!
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Making your menu" />
            <br />
            <br />

            <ol>
                <li>Fold a piece of paper in half.</li>
                <li>On the outside, you need to write the name of your café and the word ‘Menu’.</li>
                <li>
                    Find out from the chef what food and drink will be on the menu today. It might be a set menu today (one without any
                    choices)!
                </li>
                <li>
                    Write the food and drink inside the menu (you might want your grownup to draw lines to help make your writing neat).
                </li>
            </ol>

            <div className="img_container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/my_cafe.png`} alt="ABC" />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Other ideas of how to create your café" />
            <br />
            <br />

            <ul>
                <li>You could set the table, maybe even using a tablecloth.</li>
                <li>You could sit down together and look at the menu before you serve the food.</li>
                <li>You could help the chef with the cooking.</li>
            </ul>

            <br />
        </div>
    );
};

export default MyCafe;
