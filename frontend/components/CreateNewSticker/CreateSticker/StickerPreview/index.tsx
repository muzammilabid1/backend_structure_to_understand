/* eslint-disable @next/next/no-img-element */
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Grid } from '@mui/material';
import { useEffect, useMemo, useRef } from 'react';

import { checkContrast } from '../../../../shared/Services/handler';
import { ILwpStickerCharacterItem } from '../../../../types/entities/ILwpStickerCharacterItem';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface StickerPreviewProps {
    values: {
        title: string;
        textColor: string;
        borderColor: string;
        characterType: string;
        itemType: string;
        file: string;
    };
    activeItems: ILwpStickerCharacterItem[];
    activeCharacters: ILwpStickerCharacterItem[];
    setFieldValue: (fieldName: string, file: string) => void;
}

const StickerPreview = ({ values, activeCharacters, activeItems, setFieldValue }: StickerPreviewProps) => {
    const canvasRef = useRef(null);

    const drawBottomArcText = (
        ctx: CanvasRenderingContext2D,
        text: string,
        centerX: number,
        centerY: number,
        radius: number,
        textColor: string
    ) => {
        ctx.fillStyle = textColor;
        ctx.font = 'bold 34px Verdana'; // Ensure font size is correctly set
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        const maxArc = (290 * Math.PI) / 180; // Maximum arc of 290 degrees

        // Measure each character width and calculate total text width
        const textWidths = [];
        let totalTextWidth = 0;

        for (let i = 0; i < text?.length; i++) {
            const charWidth = ctx.measureText(text[i]).width;

            textWidths.push(charWidth);
            totalTextWidth += charWidth;
        }

        const textArcLength = Math.min(maxArc, totalTextWidth / radius); // Adjust the arc dynamically based on text width

        // Calculate the starting angle to center the text along the bottom arc
        let currentAngle = Math.PI / 2 + textArcLength / 2 - (1 * Math.PI) / 180;

        for (let i = 0; i < text?.length; i++) {
            const charWidth = textWidths[i]; // Get individual character width
            const charArcLength = (charWidth / totalTextWidth) * textArcLength; // Proportion of arc for this character

            // Calculate the angle for each character based on its width
            const angle = currentAngle - charArcLength / 2;
            const x = centerX + radius * Math.cos(angle); // Calculate the x-coordinate
            const y = centerY + radius * Math.sin(angle); // Calculate the y-coordinate

            ctx.save();
            ctx.translate(x, y); // Move to character's position
            ctx.rotate(angle - Math.PI / 2); // Rotate each character to make it upright
            ctx.fillText(text[i], 0, 0); // Draw the individual character
            ctx.restore();

            // Update the current angle for the next character, moving leftward by the character's arc length
            currentAngle -= charArcLength;
        }
    };

    // Helper function to draw a circle
    const drawCircle = (
        ctx: CanvasRenderingContext2D,
        centerX: number,
        centerY: number,
        radius: number,
        startAngle: number,
        endAngle: number,
        strokeStyle: string,
        lineWidth: number
    ) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.closePath();
    };

    // Helper function to convert canvas to Base64 and set it in the form
    const exportCanvasToBase64 = (canvas: HTMLCanvasElement): void => {
        try {
            const base64Image = canvas.toDataURL('image/png');

            setFieldValue('file', base64Image);
        } catch (error) {
            console.error('Error exporting the canvas:', error);
        }
    };

    // Main function to generate the image
    const generateImage = (): void => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions
        canvas.width = 370;
        canvas.height = 370;

        const activeCharacter = activeCharacters.find((char) => char.id == values.characterType);
        const activeItem = activeItems.find((char) => char.id == values.itemType);

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const circleCenterX = canvas.width / 2;
        const circleCenterY = 205; // Adjust the Y position
        const circleRadius = 130;
        const borderColor = values.borderColor || '#000';
        const borderWidth = 55;

        // Draw bottom hollow half-circle (common for both scenarios)
        drawCircle(ctx, circleCenterX, circleCenterY, circleRadius, Math.PI - 0.33, 0.33, borderColor, borderWidth);

        // Priority 2: Draw the center character if available
        if (activeCharacter) {
            const centerImage = new Image();

            centerImage.crossOrigin = 'Anonymous';
            centerImage.src = activeCharacter.imageUrl;
            centerImage.onload = () => {
                const imageWidth = centerImage.naturalWidth > 300 ? 300 : centerImage.naturalWidth;
                const imageHeight = centerImage.naturalHeight > 300 ? 300 : centerImage.naturalHeight;
                const centerX = circleCenterX - imageWidth / 2;
                const centerY = circleCenterY - imageHeight / 2;

                ctx.save();
                ctx.drawImage(centerImage, centerX, centerY, imageWidth, imageHeight);
                ctx.restore();

                // Priority 1: Draw the top hollow circle (BEHIND the character)
                drawCircle(ctx, circleCenterX, circleCenterY, circleRadius, 0.3, Math.PI - 0.3, borderColor, borderWidth);

                // Priority 5: Draw the text along the bottom arc
                drawBottomArcText(ctx, values.title, circleCenterX, circleCenterY, circleRadius, values.textColor);

                // Convert the canvas to Base64 image after drawing
                exportCanvasToBase64(canvas);
            };
        } else {
            // Draw top hollow circle (no character scenario)
            drawCircle(ctx, circleCenterX, circleCenterY, circleRadius, 0.3, Math.PI - 0.3, borderColor, borderWidth);

            // Draw text along the bottom arc
            drawBottomArcText(ctx, values.title, circleCenterX, circleCenterY, circleRadius, values.textColor);

            // Convert the canvas to Base64 image
            exportCanvasToBase64(canvas);
        }

        // Priority 4: Draw the top image (item) if available
        if (activeItem) {
            const topImage = new Image();

            topImage.crossOrigin = 'Anonymous';
            topImage.src = activeItem.imageUrl;
            topImage.onload = () => {
                const imageWidth = topImage.naturalWidth;
                const imageHeight = topImage.naturalHeight;
                const x = circleCenterX - imageWidth / 2;
                const y = 0;

                ctx.drawImage(topImage, x, y, imageWidth, imageHeight);
                exportCanvasToBase64(canvas);
            };
        }

        // If neither character nor item is selected, convert the canvas to Base64
        if (!activeCharacter && !activeItem) {
            exportCanvasToBase64(canvas);
        }
    };

    useEffect(() => {
        generateImage();
    }, [values.borderColor, values.textColor, values.itemType, values.characterType, values.title]);

    const isBorderAndTextColorFollowWCAG: boolean = useMemo(() => {
        return checkContrast(values.borderColor, values.textColor);
    }, [values.borderColor, values.textColor]);

    return (
        <div className="image-preview">
            <Paragraph text={'Preview'} centerText />

            <canvas ref={canvasRef} width="500" height="500" style={{ display: 'none' }}></canvas>
            {values.file ? (
                <img src={values.file} alt="Generated Circle" style={{ maxWidth: 350, margin: 'auto' }} />
            ) : (
                <Paragraph text={'No image generated yet.'} centerText />
            )}
            {!isBorderAndTextColorFollowWCAG ? (
                <Grid container gap={2} className="color-combination-warning" alignSelf="center" flexWrap="nowrap">
                    <Grid>
                        <ErrorOutlineIcon color="error" />
                    </Grid>
                    <Grid xs>
                        <Paragraph text="The current combination of border and text colour doesn't meet accessibility requirements (not enough contrast). Please consider changing one of the colours." />
                    </Grid>
                </Grid>
            ) : null}
        </div>
    );
};

export default StickerPreview;
