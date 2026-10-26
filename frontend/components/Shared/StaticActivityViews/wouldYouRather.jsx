import React from 'react';

import sharedJson from '../../../shared/json/index.json';
import Divider from '../Divider';
import ReactCarousel from '../ReactCarousel';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const WouldYouRather = () => {
    return (
        <div className="happy_birthday good_and_bad spot_the_difference">
            <Heading1 centerText text="Would you rather…" />

            <Divider customClass="my5" />

            <ReactCarousel array={sharedJson?.would_you_rather_carousel_item} />

            <br />

            <Heading1 customClass="sub_heading" centerText text="The Activity" />

            <br />

            <Paragraph>
                Discuss the question together. There is no &quot;right&quot; answer to these questions, so your discussion should last
                several minutes, as you try to work out what you think, explain your reasons, and work out what might make you choose the
                other option. Both people should share their ideas! Try to challenge the other person’s thinking by asking questions –
                questions that start, “But what if…” can be really good!
            </Paragraph>

            <br />

            <Paragraph>
                Try discussing another question. Remember, there is no right or wrong answer - it is all about explaining your reasons and
                sharing your ideas. You could press the left and right buttons above to see some more questions or you could make up one of
                your own!
            </Paragraph>

            <br />
        </div>
    );
};

export default WouldYouRather;
