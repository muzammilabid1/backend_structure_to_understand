import React from 'react';

import { createRefreshableAbortController } from '../../../shared/Services/abortStateManagement';
import UploadFile from '../../Parent/UploadFile';
import CommonAudioRecorder from '../CommonAudioRecorder';
import CommonListWithIcon from '../CommonListWithIcon';
import InputField from '../InputField/InputField';
import Heading1 from '../Typography/Heading1';
import Heading2 from '../Typography/Heading2';
import { AudioIcon, CommentIcon, NoteIcon, PhotoIcon } from './icons';

type Variant = 'scrapbook' | 'reading-log-parent' | 'reading-log-teacher';

interface CardDefinition {
    icon: React.ReactNode;
    text: string;
    type: string;
    className?: string;
    dataTest?: string;
}

interface CommentConfig {
    boxClassName: string;
    fieldName: string;
    label: string;
    helperText?: React.ReactNode;
    dataTest?: string;
}

interface VariantConfig {
    fieldsContainerClassName: string;
    cardsContainerClassName: string;
    cardClassName: string;
    cardImageTextClassName: string;
    disabledClassName?: string;
    cards: CardDefinition[];
    renderHeading: (text: string) => React.ReactNode;
    comment: CommentConfig;
    audioHelperText?: React.ReactNode;
    photoSkipPresignedUrl?: boolean;
    photoBtnClass?: string;
}

const VARIANT_CONFIGS: Record<Variant, VariantConfig> = {
    scrapbook: {
        fieldsContainerClassName: 'scrapbook-thoughts-fields',
        cardsContainerClassName: 'scrapbook-input-card-container',
        cardClassName: 'scrapbook-input-card',
        cardImageTextClassName: 'scrapbook-input-card-image-text',
        cards: [
            { icon: <CommentIcon />, text: 'Comment', type: 'comment', dataTest: 'scrapbook-comment-card' },
            { icon: <AudioIcon />, text: 'Audio', type: 'audio', dataTest: 'scrapbook-audio-card' },
            { icon: <PhotoIcon />, text: 'Photo', type: 'photo', dataTest: 'scrapbook-photo-card' }
        ],
        renderHeading: (text) => <Heading1 text={text} />,
        comment: {
            boxClassName: 'scrapbook-comment-box',
            fieldName: 'comment',
            label: 'Any comments?',
            dataTest: 'scrapbook-comment-input'
        },
        photoSkipPresignedUrl: true,
        photoBtnClass: 'upload-photo-button'
    },
    'reading-log-parent': {
        fieldsContainerClassName: 'readinglog-thoughts-fields',
        cardsContainerClassName: 'readinglog-input-card-container',
        cardClassName: 'readinglog-input-card',
        cardImageTextClassName: 'readinglog-input-card-image-text',
        disabledClassName: 'readinglog-input-disable',
        cards: [
            { icon: <CommentIcon />, text: 'Comment', type: 'comment', className: 'comment-card', dataTest: 'comment-card' },
            { icon: <AudioIcon />, text: 'Audio', type: 'audio', dataTest: 'audio-card' },
            { icon: <PhotoIcon />, text: 'Photo', type: 'photo', dataTest: 'photo-card' }
        ],
        renderHeading: (text) => <Heading1 text={text} />,
        comment: {
            boxClassName: 'readinglog-comment-box',
            fieldName: 'comments',
            label: 'Any comments?',
            helperText: <span className="helper-text">e.g. &quot;We learned a new word.&quot;</span>,
            dataTest: 'comment-input'
        }
    },
    'reading-log-teacher': {
        fieldsContainerClassName: 'readinglog-thoughts-fields',
        cardsContainerClassName: 'readinglog-input-card-container on-teacher',
        cardClassName: 'readinglog-input-card',
        cardImageTextClassName: 'readinglog-input-card-image-text',
        cards: [
            {
                icon: <CommentIcon />,
                text: `Comment to\nshare with parents`,
                type: 'comment',
                className: 'comment-card extra-width'
            },
            { icon: <NoteIcon />, text: `Internal note\nfor school`, type: 'note', className: 'comment-card width' },
            { icon: <AudioIcon />, text: `Record an\naudio clip`, type: 'audio', className: 'width audio-card' }
        ],
        renderHeading: (text) => <Heading2 customClass="readinglog-input-heading" text={text} centerText />,
        comment: {
            boxClassName: 'readinglog-comment-box',
            fieldName: 'comments',
            label: 'Comments to share with parents (Optional)',
            helperText: <span className="helper-text">This pupil&apos;s parents will be notified of any comments left here</span>
        },
        audioHelperText: <span className="helper-text">This is visible to the pupil&apos;s parents as well </span>
    }
};

const NOTE_CONFIG = {
    boxClassName: 'readinglog-comment-box',
    fieldName: 'note',
    label: 'Internal note for school (Optional)',
    helperText: <span className="helper-text">This note is not shared with parents and is only visible to school staff</span>
};

interface FieldCardOptionsProps {
    variant: Variant;
    isFieldShow: string[];
    setIsFieldShow: React.Dispatch<React.SetStateAction<string[]>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleChange?: (e: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFieldValue?: (name: string, value: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleBlur?: (e: any) => void;
    setFileName?: (name: string | null) => void;
    disabled?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSavingLock?: (field: string, value: any) => void;
}

const FieldCardOptions = ({
    variant,
    isFieldShow,
    setIsFieldShow,
    values,
    handleChange,
    setFieldValue,
    handleBlur,
    setFileName,
    disabled = false,
    setSavingLock
}: FieldCardOptionsProps) => {
    const audioAbort = createRefreshableAbortController();
    const photoAbort = createRefreshableAbortController();

    // True only when the photo field was opened by tapping the card, so an existing photo being
    // restored into the form does not pop the source menu open on its own.
    const [photoOpenedByTap, setPhotoOpenedByTap] = React.useState(false);

    const config = VARIANT_CONFIGS[variant];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setField = (name: string, value: any) => {
        if (setFieldValue) {
            setFieldValue(name, value);
        } else {
            handleChange?.({ target: { name, value } });
        }
    };

    const makeRemoveList = (type: string, fieldName: string, abort?: { abort: () => void }) => [
        {
            text: 'Remove',
            icon: 'delete',
            iconRight: false,
            bold: true,
            onClick: () => {
                if (disabled) return;
                abort?.abort();
                setIsFieldShow((prev) => prev.filter((t) => t !== type));
                setField(fieldName, '');
            }
        }
    ];

    const renderField = (type: string) => {
        switch (type) {
            case 'comment': {
                const c = config.comment;

                return (
                    <div key="comment" className={c.boxClassName}>
                        <CommonListWithIcon list={makeRemoveList('comment', c.fieldName)} />
                        <InputField
                            label={c.label}
                            name={c.fieldName}
                            rows={8}
                            lg={12}
                            md={12}
                            multiline
                            value={values[c.fieldName]}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            helperText={c.helperText}
                            disabled={disabled}
                            dataTest={c.dataTest}
                        />
                    </div>
                );
            }

            case 'note':
                return (
                    <div key="note" className={NOTE_CONFIG.boxClassName}>
                        <CommonListWithIcon list={makeRemoveList('note', NOTE_CONFIG.fieldName)} />
                        <InputField
                            label={NOTE_CONFIG.label}
                            name={NOTE_CONFIG.fieldName}
                            rows={8}
                            lg={12}
                            md={12}
                            multiline
                            value={values[NOTE_CONFIG.fieldName]}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            helperText={NOTE_CONFIG.helperText}
                        />
                    </div>
                );

            case 'audio':
                return (
                    <React.Fragment key="audio">
                        <br />
                        <div className="upload-img-right-content">
                            <CommonListWithIcon list={makeRemoveList('audio', 'audioFile', audioAbort)} />
                            <CommonAudioRecorder
                                src={typeof values.audioFile === 'object' ? values.audioFile?.audioUrl : undefined}
                                onClose={() => setField('audioFile', '')}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                callback={(e: any) => {
                                    setField('audioFile', e);
                                    setSavingLock?.('audioFile', e);
                                }}
                                isShowCancelIcon={false}
                                helperText={config.audioHelperText as string}
                                abort={audioAbort}
                                onSaveStart={setSavingLock ? () => setSavingLock('audioFile', true) : undefined}
                                onSaveEnd={setSavingLock ? () => setSavingLock('audioFile', false) : undefined}
                            />
                        </div>
                    </React.Fragment>
                );

            case 'photo':
                return (
                    <React.Fragment key="photo">
                        <br />
                        <div className={values.photo ? 'image-uploaded-container' : 'upload-img-right-content'}>
                            <CommonListWithIcon list={makeRemoveList('photo', 'photo', photoAbort)} />
                            <UploadFile
                                heading=""
                                setFileName={setFileName}
                                previewImage={
                                    typeof values.photo === 'object' ? (values.photo?.preview ?? values.photo?.filename) : values.photo
                                }
                                onClose={() => setField('photo', '')}
                                btnClass={config.photoBtnClass}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onSave={(croppedImage: any) => {
                                    setField('photo', croppedImage);
                                    setSavingLock?.('photo', croppedImage);
                                }}
                                isShowCancelIcon={false}
                                abort={photoAbort}
                                skipPresignedUrl={config.photoSkipPresignedUrl}
                                openSourceOnMount={photoOpenedByTap}
                                onSaveStart={setSavingLock ? () => setSavingLock('photo', true) : undefined}
                                onSaveEnd={setSavingLock ? () => setSavingLock('photo', false) : undefined}
                            />
                        </div>
                    </React.Fragment>
                );

            default:
                return null;
        }
    };

    const visibleCards = config.cards.filter((card) => !isFieldShow.includes(card.type));

    return (
        <>
            <div className={config.fieldsContainerClassName}>{isFieldShow.map((type) => renderField(type))}</div>

            <div className={config.cardsContainerClassName}>
                {visibleCards.map((card) => (
                    <div
                        key={card.type}
                        className={[config.cardClassName, card.className, disabled ? config.disabledClassName : '']
                            .filter(Boolean)
                            .join(' ')}
                        onClick={() => {
                            if (disabled) return;
                            if (card.type === 'photo') setPhotoOpenedByTap(true);
                            setIsFieldShow((prev) => [...prev, card.type]);
                        }}
                        data-test={card.dataTest}>
                        <div className={config.cardImageTextClassName}>
                            {card.icon}
                            {config.renderHeading(card.text)}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

export default FieldCardOptions;
