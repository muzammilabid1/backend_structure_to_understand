import { degrees, PDFDocument, PDFFont, PDFName, PDFPage, PDFRef, rgb } from 'pdf-lib';
import Highcharts from 'highcharts';
import exporting from 'highcharts/modules/exporting';
import { IMPACT_REPORT_V2_PROGRAM_OVERVIEW_DESCRIPTION, IMPACT_REPORT_V2_GRAPHS_INFO, MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { ILwpSchoolImpactReportV2 } from '../../../types/entities/ILwpSchoolImpactReport';
import { SchoolImpactReportFeedbackContentType } from 'lwp-shared';
import { generateGraphId, showDate } from '../../../shared/Services/handler';
import fontkit from '@pdf-lib/fontkit';
import { getImpactReportV2ContentList } from './ImpactReportV2/ImpactReportV2Output';

if (typeof Highcharts === 'object') {
    // Initialize the exporting module
    exporting(Highcharts);
}

// Define A4 dimensions (landscape orientation)
const A4_LANDSCAPE: [number, number] = [841.89, 595.28]; // Width x Height
const BLACK_COLOR = rgb(0, 0, 0);
const ORANGE_COLOR = rgb(242 / 255, 141 / 255, 0 / 255);

// Set up styles
const headerSize = 24;
const textSize = 12;
const lineHeight = 18;
const MARGIN = 30;

const handlePrintReport = async (report: ILwpSchoolImpactReportV2, schoolName: string) => {
    try {
        const programOverviewtitles = IMPACT_REPORT_V2_PROGRAM_OVERVIEW_DESCRIPTION;

        // Create a new PDFDocument
        const pdfDoc: PDFDocument = await PDFDocument.create();

        // Register fontkit with the PDFDocument
        pdfDoc.registerFontkit(fontkit);

        const WHITE_COLOR = rgb(1, 1, 1);
        const verdanaFontBytes = await fetch('/assets/fonts/verdana.ttf').then((res) => res.arrayBuffer());
        const verdanaBoldFontBytes = await fetch('/assets/fonts/verdana-bold.ttf').then((res) => res.arrayBuffer());
        const chaloopsMediumFontBytes = await fetch('/assets/fonts/chaloopsv3.ttf').then((res) => res.arrayBuffer());

        // Load fonts
        const verdanaFont: PDFFont = await pdfDoc.embedFont(verdanaFontBytes);
        const verdanaBoldFont: PDFFont = await pdfDoc.embedFont(verdanaBoldFontBytes);
        const chaloopsMediumFont: PDFFont = await pdfDoc.embedFont(chaloopsMediumFontBytes, { features: { kern: false } });

        const lwpLogoBaseURL = await imageUrlToBase64(
            `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/lwp-site-logo.png`
        );

        const titlePage: PDFPage = pdfDoc.addPage(A4_LANDSCAPE);

        // Define page dimensions
        const pageWidth = titlePage.getWidth();
        const pageHeight = titlePage.getHeight();
        let cursorY = pageHeight - 170;

        const contentStartX = MARGIN * 2 + 10;

        await renderHeader(titlePage, chaloopsMediumFont, pdfDoc, lwpLogoBaseURL, 0.8);

        const titlePageX = contentStartX + 10;
        titlePage.drawText('Learning with Parents', {
            x: titlePageX,
            y: cursorY,
            size: 42,
            color: BLACK_COLOR,
            font: chaloopsMediumFont
        });

        cursorY -= 50;

        cursorY = drawWrappedText(
            titlePage,
            'Impact report for ' + schoolName,
            titlePageX,
            cursorY,
            pageWidth - MARGIN * 3,
            chaloopsMediumFont,
            24,
            lineHeight
        );

        cursorY -= 30;

        titlePage.drawText(report?.term?.termName, {
            x: titlePageX,
            y: cursorY,
            size: 24,
            color: BLACK_COLOR,
            font: chaloopsMediumFont
        });

        const contentPage: PDFPage = pdfDoc.addPage(A4_LANDSCAPE);

        cursorY = pageHeight - 100;

        // render header
        await renderHeader(contentPage, chaloopsMediumFont, pdfDoc, lwpLogoBaseURL);

        contentPage.drawText('Contents', {
            x: contentStartX, // Padding from left
            y: cursorY,
            size: headerSize,
            font: chaloopsMediumFont,
            color: BLACK_COLOR
        });
        const contentListStartX = contentStartX + 20;

        cursorY -= 40; // Space after title

        const contentPositions = drawContentList(report, contentPage, cursorY, contentListStartX, verdanaFont);

        const pageDestinations: Record<string, PDFRef> = {};

        cursorY = pageHeight - 70; // Reset cursorY for the new page

        const programOverviewPage: PDFPage = pdfDoc.addPage(A4_LANDSCAPE);

        const BOX_WIDTH = pageWidth - MARGIN * 3;

        await renderHeader(programOverviewPage, chaloopsMediumFont, pdfDoc, lwpLogoBaseURL);

        pageDestinations['programme-overview'] = programOverviewPage.ref;

        // Programme Overview Title
        programOverviewPage.drawText('Programme overview', {
            x: contentStartX, // Padding from left
            y: cursorY, // Padding from top
            size: headerSize,
            font: chaloopsMediumFont,
            color: BLACK_COLOR
        });

        cursorY -= 40; // Space after title

        // Draw columns for Launch Date, Number of Weeks, and Year Group Coverage
        const column1X = contentStartX;
        const column2X = column1X + 150;
        const column3X = column2X + 350;

        // Column Headers
        programOverviewPage.drawText('Launch date', { x: column1X, y: cursorY, size: textSize, font: verdanaBoldFont });
        programOverviewPage.drawText(programOverviewtitles.numberOfWeeksText, {
            x: column2X,
            y: cursorY,
            size: textSize,
            font: verdanaBoldFont
        });
        programOverviewPage.drawText('Year group coverage', { x: column3X, y: cursorY, size: textSize, font: verdanaBoldFont });
        cursorY -= lineHeight;

        // Column Values
        programOverviewPage.drawText(showDate({ date: report?.launchDate, justDate: true }), {
            x: column1X,
            y: cursorY,
            size: textSize,
            font: verdanaFont
        });
        programOverviewPage.drawText(report?.numberOfWeeks.toString(), {
            x: column2X,
            y: cursorY,
            size: textSize,
            font: verdanaFont
        });
        programOverviewPage.drawText(report?.yearGroupCoverage, { x: column3X, y: cursorY, size: textSize, font: verdanaFont });
        cursorY -= lineHeight * 1.5;

        const haveReadingTargets = !!report?.weeklyReadingTarget;

        // Subsection: Number of Classes
        programOverviewPage.drawText('Number of classes', {
            x: column1X,
            y: cursorY,
            size: textSize,
            font: verdanaBoldFont
        });

        if (haveReadingTargets)
            programOverviewPage.drawText('Weekly reading target in days', {
                x: column2X,
                y: cursorY,
                size: textSize,
                font: verdanaBoldFont
            });

        cursorY -= lineHeight;

        programOverviewPage.drawText(report?.numberOfClasses.toString(), {
            x: column1X,
            y: cursorY,
            size: textSize,
            font: verdanaFont
        });

        if (haveReadingTargets)
            programOverviewPage.drawText(report?.weeklyReadingTarget.toString(), {
                x: column2X,
                y: cursorY,
                size: textSize,
                font: verdanaFont
            });

        cursorY -= lineHeight * 1.5;

        if (report?.spmNote) {
            // Subsection: SPM Note
            programOverviewPage.drawText('A comment from your School Partnership Manager:', {
                x: column1X,
                y: cursorY,
                size: textSize,
                font: verdanaBoldFont
            });
            cursorY -= lineHeight;

            // Render SPM Note dynamically
            cursorY = drawWrappedText(
                programOverviewPage,
                report.spmNote.replace(/[\r|\n]+/g, ' '),
                column1X,
                cursorY,
                BOX_WIDTH,
                verdanaFont,
                textSize,
                lineHeight
            );

            cursorY -= lineHeight * 1.5; // Additional spacing after the note
        }
        const activeFamiliesText = `${report?.activeFamiliesPercentage}% of pupils are active`;
        // Highlighted Key Statistics
        programOverviewPage.drawText(activeFamiliesText, {
            x: column1X,
            y: cursorY,
            size: textSize,
            font: verdanaBoldFont
        });

        if (report?.showNationalDataAverage)
            programOverviewPage.drawText(` (Learning with Parents national average: ${report?.activeFamiliesPercentageAllSchools}%)`, {
                x: column1X + verdanaBoldFont.widthOfTextAtSize(activeFamiliesText, textSize),
                y: cursorY,
                size: textSize,
                font: verdanaFont
            });

        cursorY -= lineHeight;

        cursorY = drawWrappedText(
            programOverviewPage,
            programOverviewtitles.activeFamilyDescription,
            column1X,
            cursorY,
            BOX_WIDTH,
            verdanaFont,
            textSize,
            lineHeight
        );

        cursorY -= lineHeight * 1.5;
        const activePremiumFamiliesText = `${report?.activePremiumFamiliesPercentage}% of pupil premium pupils are active`;

        programOverviewPage.drawText(activePremiumFamiliesText, {
            x: column1X,
            y: cursorY,
            size: textSize,
            font: verdanaBoldFont
        });

        if (report?.showNationalDataAverage)
            programOverviewPage.drawText(
                ` (Learning with Parents national average: ${report?.activePremiumFamiliesPercentageAllSchools}%)`,
                {
                    x: column1X + verdanaBoldFont.widthOfTextAtSize(activePremiumFamiliesText, textSize),
                    y: cursorY,
                    size: textSize,
                    font: verdanaFont
                }
            );

        cursorY -= lineHeight;

        cursorY = drawWrappedText(
            programOverviewPage,
            programOverviewtitles.activePremiumFamilyDescription,
            column1X,
            cursorY,
            BOX_WIDTH,
            verdanaFont,
            textSize,
            lineHeight
        );

        cursorY -= lineHeight * 1.5;

        if (report?.graphs?.length) {
            const chartInstances = Highcharts.charts.filter((chart) => !!chart);
            for (const graph of report?.graphs) {
                cursorY = pageHeight - 70;
                const isReading = !graph?.subject;

                const graphInfo = isReading ? IMPACT_REPORT_V2_GRAPHS_INFO.READING : IMPACT_REPORT_V2_GRAPHS_INFO.TOPIC_ACTIVITY;

                const subjectName = isReading ? 'Reading' : graph?.subject?.name;

                const graphsMap = {
                    buildingEngagement: chartInstances?.find(
                        (chart) => chart?.options?.chart?.renderTo === generateGraphId(graph?.id, 'buildingEngagement')
                    ),
                    engagementByYearGroup: chartInstances?.find(
                        (chart) => chart?.options?.chart?.renderTo === generateGraphId(graph?.id, 'engagementByYearGroup')
                    ),
                    avgCompletionRateByYearGroup: chartInstances?.find(
                        (chart) => chart?.options?.chart?.renderTo === generateGraphId(graph?.id, 'avgCompletionRateByYearGroup')
                    ),
                    avgTopicSetByClass: chartInstances?.find(
                        (chart) => chart?.options?.chart?.renderTo === generateGraphId(graph?.id, 'avgTopicSetByClass')
                    )
                };

                let firstGraphRef: any = null;

                for (const [key, chartInstance] of Object.entries(graphsMap)) {
                    if (!chartInstance) continue;
                    const { title, description } = graphInfo[key as keyof typeof graphsMap];

                    const page = await renderGraph(
                        pdfDoc,
                        chaloopsMediumFont,
                        verdanaFont,
                        lwpLogoBaseURL,
                        subjectName,
                        cursorY,
                        contentStartX,
                        BOX_WIDTH,
                        title,
                        description,
                        chartInstance
                    );
                    if (chartInstance?.options?.chart?.renderTo && page?.ref) {
                        pageDestinations[chartInstance.options.chart.renderTo as string] = page.ref;

                        if (!firstGraphRef) firstGraphRef = page.ref;
                    }
                }

                if (graph?.id && firstGraphRef) {
                    pageDestinations[String(graph.id)] = firstGraphRef;
                }
            }
        }

        const feedbacks = report?.feedbacks;

        if (feedbacks.length > 0) {
            let photosAndCommentsPage: PDFPage = pdfDoc.addPage(A4_LANDSCAPE);
            const WHITE_BOX_MARGIN = 20;

            cursorY = pageHeight - 70; // Reset cursorY for the new page

            // render header
            await renderHeader(photosAndCommentsPage, chaloopsMediumFont, pdfDoc, lwpLogoBaseURL);
            pageDestinations['photos-and-comments'] = photosAndCommentsPage.ref;

            // Photos and Comments Title
            photosAndCommentsPage.drawText('Photos and Comments', {
                x: contentStartX, // Padding from left
                y: cursorY,
                size: headerSize,
                font: chaloopsMediumFont,
                color: BLACK_COLOR
            });

            // Photos and Comments of the report
            for (let ind = 0; ind < feedbacks.length; ind++) {
                const feedback = feedbacks[ind];
                let contentHeight = 0;
                let pngImage = null;

                if (feedback?.contentType === SchoolImpactReportFeedbackContentType.PHOTO) {
                    const base64 = await imageUrlToBase64(feedback.content);
                    pngImage = await pdfDoc.embedPng(base64);
                    const { height } = calculateScaledDimensions(pngImage.width, pngImage.height);

                    contentHeight = height + 10;
                } else {
                    contentHeight = calculateTextHeight(
                        feedback.content ?? '--',
                        BOX_WIDTH - WHITE_BOX_MARGIN * 2,
                        verdanaFont,
                        textSize,
                        lineHeight
                    );
                }

                const commentHeight = contentHeight + 20 + WHITE_BOX_MARGIN * 2;

                cursorY -= 20;

                if (cursorY - commentHeight < 80) {
                    const newPage = pdfDoc.addPage(A4_LANDSCAPE);
                    photosAndCommentsPage = newPage;

                    cursorY = pageHeight - 70; // Reset cursorY for the new page

                    // render header
                    await renderHeader(newPage, chaloopsMediumFont, pdfDoc, lwpLogoBaseURL);
                }

                photosAndCommentsPage.drawRectangle({
                    x: contentStartX,
                    y: cursorY - commentHeight,
                    width: BOX_WIDTH,
                    height: commentHeight,
                    color: rgb(1 / 1, 246 / 255, 217 / 255)
                });

                photosAndCommentsPage.drawRectangle({
                    x: contentStartX + 2,
                    y: cursorY - commentHeight + 2,
                    width: BOX_WIDTH - 4,
                    height: commentHeight - 4,
                    color: WHITE_COLOR
                });

                cursorY -= 30;

                if (feedback?.contentType === SchoolImpactReportFeedbackContentType.PHOTO) {
                    const { width, height } = calculateScaledDimensions(pngImage.width, pngImage.height);

                    // Draw the feedback image onto the PDF page
                    photosAndCommentsPage.drawImage(pngImage, {
                        x: (pageWidth - width + contentStartX) / 2, // Center horizontally
                        y: cursorY - height + lineHeight - 10, // Position vertically based on cursorY
                        width: width, // Use scaled width
                        height: height // Use scaled height
                    });

                    cursorY -= height + 10;
                } else {
                    // Render the feedback content
                    cursorY = drawWrappedText(
                        photosAndCommentsPage,
                        `"${feedback.content}"`,
                        contentStartX + WHITE_BOX_MARGIN,
                        cursorY,
                        BOX_WIDTH - WHITE_BOX_MARGIN * 2,
                        verdanaFont,
                        textSize,
                        lineHeight
                    );
                }

                cursorY -= 10;

                const commentBy = `${feedback?.contentType === SchoolImpactReportFeedbackContentType.PARENT_COMMENT ? 'Parent of ' : ''}${feedback?.pupilFirstName}, ${feedback?.className} (${feedback?.classYearGroup})`;

                const commentByWidth = verdanaBoldFont.widthOfTextAtSize(commentBy, textSize);

                photosAndCommentsPage.drawText(commentBy, {
                    x: pageWidth - commentByWidth * 0.9 - MARGIN,
                    y: cursorY,
                    size: textSize,
                    font: verdanaFont,
                    color: BLACK_COLOR
                });

                cursorY -= lineHeight;
            }
        }

        const annotations = contentPositions
            ?.map((pos) => {
                const dest = pageDestinations?.[pos?.id];

                if (!dest) return null;

                return createPageLinkAnnotation(pdfDoc, dest, pos.rect);
            })
            ?.filter(Boolean);

        if (annotations?.length > 0) {
            contentPage.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annotations as any));
        }

        // Save the PDF and open in a new tab

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `${report?.term?.termName} Impact Report.pdf`;
        link.click();
    } catch (e) {
        throw new Error(e?.message ?? e);
    }
};

const renderHeader = async (page: PDFPage, font: PDFFont, pdfDoc: PDFDocument, lwpLogo: string, scale = 0.3): Promise<void> => {
    const fullPageWidth = page.getWidth();
    const fullPageHeight = page.getHeight();

    const impactReportFontSize = 24;
    const impactReport = 'Impact Report';
    const impactReportWidth = font.widthOfTextAtSize(impactReport, impactReportFontSize);

    page.drawRectangle({
        x: MARGIN,
        y: impactReportWidth + MARGIN + lineHeight,
        width: 10,
        height: fullPageHeight - impactReportWidth - MARGIN,
        color: ORANGE_COLOR
    });

    page.drawText(impactReport, {
        x: MARGIN + 13, // Adjust x-coordinate as per your layout
        y: MARGIN, // Adjust y-coordinate as per your layout
        size: impactReportFontSize,
        color: ORANGE_COLOR, // Orange color
        rotate: degrees(90), // Rotate text for vertical alignment
        font: font
    });

    const pngImage = await pdfDoc.embedPng(lwpLogo);
    const { width, height } = pngImage.scale(scale);

    // Draw the lwp logo onto the PDF page
    page.drawImage(pngImage, {
        x: fullPageWidth - width - MARGIN,
        y: MARGIN,
        width: width,
        height: height
    });
};

// Helper function to calculate text height dynamically
const calculateTextHeight = (text: string, maxWidth: number, font: PDFFont, fontSize: number, lineHeight: number): number => {
    const words = text?.split(' ');
    let line = '';
    let height = 0;

    words?.forEach((word) => {
        const testLine = line + word + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && line !== '') {
            height += lineHeight; // Add a line's height
            line = word + ' '; // Start a new line
        } else {
            line = testLine; // Add the word to the current line
        }
    });

    if (line !== '') {
        height += lineHeight; // Add height for the last line
    }

    return height; // Return the total height
};

type ImpactReportContentListItem = { label: string; id?: string; children?: ImpactReportContentListItem[] };
type ContentPosition = { id?: string; rect: [number, number, number, number] };

const drawContentList = (
    report: ILwpSchoolImpactReportV2,
    page: PDFPage,
    startY: number,
    startX: number,
    font: PDFFont
): ContentPosition[] => {
    const contentList = getImpactReportV2ContentList(report);
    const INDENT = 20;
    let cursorY = startY;
    const positions: ContentPosition[] = [];

    const renderItems = (list: ImpactReportContentListItem[], depth = 0) => {
        list?.forEach((item) => {
            const prefix = '• ';
            const x = startX + depth * INDENT;
            const text = `${prefix}${item.label}`;
            const width = font.widthOfTextAtSize(text, textSize);

            page.drawText(text, {
                x,
                y: cursorY,
                size: textSize,
                font: font,
                color: BLACK_COLOR
            });

            // Record clickable rectangle for this line
            positions.push({ id: item.id, rect: [x, cursorY + lineHeight, x + width, cursorY] });

            cursorY -= lineHeight;

            if (item?.children?.length) {
                renderItems(item.children, depth + 1);
            }

            if (depth === 0) cursorY -= 3; // Extra space after top-level items
        });
    };

    renderItems(contentList, 0);

    return positions;
};

// Helper function to render multi-line text with optional center alignment
const drawWrappedText = (
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    font: PDFFont,
    fontSize: number,
    lineHeight: number,
    alignCenter = false // New parameter for center alignment
) => {
    const words = text.split(' ');
    let line = '';
    let cursorY = y;

    words.forEach((word) => {
        const testLine = line + word + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && line !== '') {
            // Calculate x position for alignment
            const lineWidth = font.widthOfTextAtSize(line.trim(), fontSize);
            const lineX = alignCenter ? x + (maxWidth - lineWidth) / 2 : x;

            // Render the current line
            page.drawText(line.trim(), {
                x: lineX, // Adjust x if center-aligned
                y: cursorY,
                size: fontSize,
                font,
                color: BLACK_COLOR
            });

            // Move cursor to the next line
            cursorY -= lineHeight;
            line = word + ' '; // Start a new line
        } else {
            line = testLine; // Add the word to the current line
        }
    });

    // Render the last line
    if (line !== '') {
        const lineWidth = font.widthOfTextAtSize(line.trim(), fontSize);
        const lineX = alignCenter ? x + (maxWidth - lineWidth) / 2 : x;

        page.drawText(line.trim(), {
            x: lineX, // Adjust x if center-aligned
            y: cursorY,
            size: fontSize,
            font,
            color: BLACK_COLOR
        });

        cursorY -= lineHeight;
    }

    return cursorY; // Return the updated cursorY position
};

// Convert SVG Base64 to PNG
const svgToPng = async (svgBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = svgBase64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas?.toDataURL('image/png'));
        };
        img.onerror = () => {
            reject('An error occurred while loading the image for printing.');
        };
    });
};

const imageUrlToBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.crossOrigin = 'Anonymous';

        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            resolve(canvas?.toDataURL('image/png'));
        };

        img.onerror = function () {
            reject('An error occurred while loading the image for printing.');
        };

        img.src = url;
    });
};

const calculateScaledDimensions = (originalWidth: number, originalHeight: number) => {
    const maxWidth = 500;
    const maxHeight = 360;

    const safeWidth = originalWidth > 0 ? originalWidth : 1;
    const safeHeight = originalHeight > 0 ? originalHeight : 1;

    const scaleFactor = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1); // Never scale up

    return {
        width: originalWidth * scaleFactor,
        height: originalHeight * scaleFactor
    };
};

const renderGraph = async (
    pdfDoc: PDFDocument,
    font: PDFFont,
    verdanaFont: PDFFont,
    logo: string,
    subjectName: string,
    cursorY: number,
    contentStartX: number,
    BOX_WIDTH: number,
    graphTitle: string,
    graphDescription: string,
    chart: Highcharts.Chart
) => {
    const graphPage: PDFPage = pdfDoc.addPage(A4_LANDSCAPE);

    // render header
    await renderHeader(graphPage, font, pdfDoc, logo);

    graphPage.drawText(subjectName, {
        x: contentStartX, // Padding from left
        y: cursorY,
        size: headerSize,
        font: font,
        color: BLACK_COLOR
    });

    cursorY -= 50; // Space after title

    const graphsContentStartX = contentStartX + 20;

    // Graph title
    graphPage.drawText(graphTitle, {
        x: graphsContentStartX, // Padding from left
        y: cursorY,
        size: headerSize,
        font: font,
        color: BLACK_COLOR
    });

    cursorY -= 30; // Space after title

    cursorY = drawWrappedText(graphPage, graphDescription, graphsContentStartX, cursorY, BOX_WIDTH, verdanaFont, textSize, lineHeight);
    const abc2 = chart.getSVG().replace('Highcharts.com', ''); // removed "Highcharts.com" promotion label from svg

    cursorY -= 50; // Space after title

    const svg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(abc2)))}`;

    const pngBase64 = await svgToPng(svg);

    const pngImage = await pdfDoc.embedPng(pngBase64);

    // ration of the graph image 3:2
    const imageHeight = 300;
    const imageWidth = 450;

    // Draw the image onto the PDF page
    graphPage.drawImage(pngImage, {
        x: contentStartX + (BOX_WIDTH - imageWidth) / 2,
        y: cursorY - imageHeight,
        width: imageWidth,
        height: imageHeight // Maintain aspect ratio
    });

    return graphPage;
};

const createPageLinkAnnotation = (pdfDoc: PDFDocument, pageRef: any, rect: [number, number, number, number]) =>
    pdfDoc.context.register(
        pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: rect,
            Dest: [pageRef, 'XYZ', null, A4_LANDSCAPE[1], null]
        })
    );

export { handlePrintReport };
