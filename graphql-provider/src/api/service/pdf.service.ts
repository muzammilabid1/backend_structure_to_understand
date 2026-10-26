import { HttpException, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import { nanoid } from 'nanoid';
import fetch from 'node-fetch';
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFPageDrawImageOptions, PDFPageDrawTextOptions, StandardFonts } from 'pdf-lib';
import { appConstants } from 'src/constants';
import * as util from 'util';

import { ErrorStatusCodeEnum } from '../model';
import { HelperService } from './helper.service';
import { MathscotItemService } from './mathscot-item.service';
import { MinioService } from './minio.service';

export type PDFDrawOptions = (PDFPageDrawTextOptions | PDFPageDrawImageOptions) & {
    font?: PdfFonts | PDFFont;
    size?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    color?: any;
    scale?: number;
};

export type PDFValues = string | PDFImage;

export enum PdfFonts {
    HELVETICA_BOLD = 'HELVETICA_BOLD',
    CHALOOPS = 'CHALOOPS',
    VERDANA = 'VERDANA'
}

export enum PdfDrawType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE'
}

export interface PDFDrawData {
    type: PdfDrawType;
    value: PDFValues;
    options: PDFDrawOptions;
}

export interface PDFData {
    fonts: PdfFonts[];
    pageData: PDFDrawData[][];
}

@Injectable()
export class PDFService implements OnApplicationBootstrap {
    readFile = util.promisify(fs.readFile);
    writeFile = util.promisify(fs.writeFile);

    fonts: { [key in PdfFonts]: Buffer | StandardFonts | null } = {
        HELVETICA_BOLD: StandardFonts.HelveticaBold,
        // This will be created on bootstrap
        CHALOOPS: null,
        VERDANA: null
    };

    drawByType: { [key in PdfDrawType]: (d: PDFDocument, p: PDFPage, v: PDFValues, o: PDFDrawOptions) => Promise<void> } = {
        IMAGE: async (doc, page, v, options) => this.drawImage(doc, page, v as string, options),
        // eslint-disable-next-line @typescript-eslint/require-await
        TEXT: async (doc, page, v, options) => this.drawText(doc, page, v as string, options as PDFPageDrawTextOptions)
    };

    constructor(
        private minioService: MinioService,
        private mathscotItemService: MathscotItemService,
        private helperService: HelperService
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        this.fonts.CHALOOPS = await this.readFile('./src/resources/chaloopsv3.ttf');
        this.fonts.VERDANA = await this.readFile('./src/resources/verdana.ttf');
    }

    async uploadAndGetUrl(fileName: string, fileContent: Buffer): Promise<string> {
        const filePath = `${appConstants.minioPaths.usermedia.generatedCertificates}/${fileName}`;

        await this.minioService.uploadPrivateFile(filePath, fileContent);

        return this.helperService.getUsermediaUrl(filePath);
    }

    drawText(_: PDFDocument, page: PDFPage, value: string, options: PDFPageDrawTextOptions): void {
        return page.drawText(value, options);
    }

    async drawImage(pdfDoc: PDFDocument, page: PDFPage, value: string, options: PDFDrawOptions): Promise<void> {
        const imageBuffer = await this.mathscotItemService
            .getBufferFromUrl(value as string)
            .toPromise()
            .then((d) => d.data);

        const pngImage = await pdfDoc.embedPng(imageBuffer);
        const { width, height } = pngImage.scale(options.scale ?? 0);

        page.drawImage(pngImage, { ...options, width, height } as PDFPageDrawImageOptions);
    }

    private getFontOrEmbed(pdfDoc: PDFDocument): (_: PdfFonts) => Promise<PDFFont> {
        const fonts = {} as { [key in PdfFonts]: PDFFont };

        return async (font: PdfFonts): Promise<PDFFont> => {
            const existing = fonts[font];

            if (!existing) {
                fonts[font] = await pdfDoc.embedFont(this.fonts[font]);
            }

            return fonts[font];
        };
    }

    async createTrophyPDF(inputFileName: string, data: PDFData): Promise<string> {
        const url = inputFileName;

        const existingPdfBytes = await fetch(url).then((res) => {
            if (res?.statusText === 'Not Found') {
                throw new HttpException('Trophy PDF not found', ErrorStatusCodeEnum._535);
            }

            return res.arrayBuffer();
        });

        const { pageData } = data;
        const sourcePdf = await PDFDocument.load(existingPdfBytes);
        const pdfDoc = await PDFDocument.create();
        const inputPage = sourcePdf.getPages()?.[0];

        const em = await pdfDoc.embedPage(inputPage);
        const getFont = this.getFontOrEmbed(pdfDoc);

        pdfDoc.registerFontkit(fontkit);

        for (const data of pageData) {
            const page = pdfDoc.addPage([inputPage.getWidth(), inputPage.getHeight()]);

            page.drawPage(em);

            for (const drawData of data) {
                const { options, type, value } = drawData;

                if (options.font) {
                    const font = await getFont(options.font as PdfFonts);

                    await this.drawByType[type](pdfDoc, page, value, { ...options, font: font as PDFFont });
                } else {
                    await this.drawByType[type](pdfDoc, page, value, options);
                }
            }
        }

        const resultPdf = await pdfDoc.save();

        return this.uploadAndGetUrl(`${nanoid()}.pdf`, Buffer.from(resultPdf));
    }
}
