import React from 'react';

import VideoCard from '../Cards/VideoCard';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const TheAlphabetSong = () => {
    return (
        <div className="happy_birthday">
            <Heading1 centerText text="The Alphabet Song" />

            <Divider customClass="my5" />

            <Paragraph>Sing the alphabet song together!</Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Things to look out for" />

            <br />
            <br />

            <ul>
                <li>
                    Children often get muddled in the middle of the alphabet with the letters <span className="_span">l m n o p</span>. Try
                    to slow down their singing of this part so they really sound like separate letters and not one &quot;lemonenopea&quot;!
                </li>
                <li>
                    Try to encourage the British pronunciation of <span className="_span">z &apos;zed&apos;</span> rather than the American
                    z &apos;zee&apos;.
                </li>
            </ul>
            <br />

            <Paragraph>Sing along with the video below!</Paragraph>

            <br />
            <br />
            <br />
            <VideoCard controls={true} videoId={'453572435'} isShowVideoTroubleshooting={true} />

            <br />
            <br />
        </div>
    );
};

export default TheAlphabetSong;
