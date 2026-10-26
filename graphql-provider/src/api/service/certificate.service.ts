import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { floor } from 'lodash';
import { rgb } from 'pdf-lib';
import { appConstants } from 'src/constants';
import * as util from 'util';

import { CertificatePdfDataForTrophy, TrophyCertificateFieldName } from '../model';
import { BlankCertificateType } from '../types/BlankCertificateType';
import { HelperService } from './helper.service';
import { MathscotItemService } from './mathscot-item.service';
import { PDFData, PdfDrawType, PdfFonts, PDFService } from './pdf.service';

export interface CertificatePdfDataForMathscot {
    pupilName: string;
    signature: string;
    starCount: number;
    dateString: string;
    mathscotImage?: string;
}

@Injectable()
export class CertificateService {
    readFile = util.promisify(fs.readFile);
    writeFile = util.promisify(fs.writeFile);

    constructor(
        private pdfService: PDFService,
        private mathscotItemService: MathscotItemService,
        private helperService: HelperService
    ) {}

    getPdfCertificate(): Promise<Buffer> {
        return this.readFile('./src/resources/MathscotCertificate.pdf');
    }

    getBlankCertificate(type: BlankCertificateType): string {
        const fileName = type === BlankCertificateType.READING ? 'Reading_Certificate.pdf' : 'Blank_Certificate.pdf';

        return this.helperService.getPublicUrl(`${appConstants.minioPaths.public.staticCertificates}/${fileName}`);
    }

    getPdfCertificateUrl(fileName: string): string {
        return this.helperService.getPublicUrl(`${appConstants.minioPaths.public.staticCertificates}/${fileName}`);
    }

    // Standard constants based formula to fit the font to the pdf.
    getMainTextFontSize(text: string): number {
        const fontSize = text.length > 20 ? floor(60 - text.length / 1.5) : 60;

        return fontSize <= 0 ? 1 : fontSize;
    }

    async generateMathscotCertificates(data: CertificatePdfDataForMathscot[], certificateName: string): Promise<string> {
        const fileName = this.getPdfCertificateUrl(certificateName);
        const pageData = [];
        const drawData: PDFData = {
            fonts: [PdfFonts.HELVETICA_BOLD],
            pageData
        };

        for (const { dateString, mathscotImage, pupilName, starCount, signature } of data) {
            drawData.pageData.push([
                {
                    type: PdfDrawType.TEXT,
                    value: pupilName,
                    options: {
                        x: 210,
                        y: 490,
                        size: this.getMainTextFontSize(pupilName),
                        font: PdfFonts.CHALOOPS,
                        color: rgb(0, 0, 0)
                    }
                },
                {
                    type: PdfDrawType.TEXT,
                    value: starCount.toString(),
                    options: {
                        x: 395 - starCount.toString().length * 10,
                        y: 385,
                        size: 40,
                        font: PdfFonts.CHALOOPS,
                        color: rgb(0, 0, 0)
                    }
                },
                {
                    type: PdfDrawType.TEXT,
                    value: dateString,
                    options: {
                        x: 260,
                        y: 210,
                        size: 30,
                        font: PdfFonts.CHALOOPS,
                        color: rgb(0, 0, 0)
                    }
                },
                {
                    type: PdfDrawType.TEXT,
                    value: signature,
                    options: {
                        x: 660,
                        y: 210,
                        size: 30,
                        font: PdfFonts.CHALOOPS,
                        color: rgb(0, 0, 0)
                    }
                },
                ...(mathscotImage
                    ? [
                          {
                              type: PdfDrawType.IMAGE,
                              value: mathscotImage,
                              options: {
                                  x: 740,
                                  y: 270,
                                  scale: 0.55
                              }
                          }
                      ]
                    : [])
            ]);
        }

        return this.pdfService.createTrophyPDF(fileName, drawData);
    }

    async generateTrophyCertificatesForPupils(data: CertificatePdfDataForTrophy[]): Promise<string> {
        const pdfFileName = data[0].fileName;

        const pageData = [];
        const drawData: PDFData = {
            fonts: [PdfFonts.HELVETICA_BOLD],
            pageData
        };

        for (const { fieldData, mathscot } of data) {
            const pupilName = fieldData.find((d) => d.fieldName === TrophyCertificateFieldName.CHILDNAME);
            const date = fieldData.find((d) => d.fieldName === TrophyCertificateFieldName.DATE);
            const totalStars = fieldData.find((d) => d.fieldName === TrophyCertificateFieldName.TOTATSTARS);
            const teacherName = fieldData.find((d) => d.fieldName === TrophyCertificateFieldName.TEACHERNAME);

            drawData.pageData.push([
                ...(pupilName
                    ? [
                          {
                              type: PdfDrawType.TEXT,
                              value: pupilName.fieldValue,
                              options: {
                                  x: pupilName.xValue ?? 125,
                                  y: pupilName.yValue ?? 460,
                                  size: pupilName.fontSize ?? this.getMainTextFontSize(pupilName.fieldName),
                                  font: PdfFonts.CHALOOPS,
                                  color: rgb(0, 0, 0)
                              }
                          }
                      ]
                    : []),
                ...(date
                    ? [
                          {
                              type: PdfDrawType.TEXT,
                              value: date.fieldValue,
                              options: {
                                  x: date.xValue ?? 210,
                                  y: date.yValue ?? 310,
                                  size: date.fontSize ?? 30,
                                  font: PdfFonts.CHALOOPS,
                                  color: rgb(0, 0, 0)
                              }
                          }
                      ]
                    : []),
                ...(totalStars
                    ? [
                          {
                              type: PdfDrawType.TEXT,
                              value: totalStars.fieldValue,
                              options: {
                                  x: totalStars.xValue,
                                  y: totalStars.yValue,
                                  size: totalStars.fontSize ?? 30,
                                  font: PdfFonts.CHALOOPS,
                                  color: rgb(0, 0, 0)
                              }
                          }
                      ]
                    : []),
                ...(teacherName
                    ? [
                          {
                              type: PdfDrawType.TEXT,
                              value: teacherName.fieldValue,
                              options: {
                                  x: teacherName.xValue,
                                  y: teacherName.yValue,
                                  size: teacherName.fontSize ?? 30,
                                  font: PdfFonts.CHALOOPS,
                                  color: rgb(0, 0, 0)
                              }
                          }
                      ]
                    : []),
                ...(mathscot
                    ? [
                          {
                              type: PdfDrawType.IMAGE,
                              value: mathscot.fieldValue ? mathscot.fieldValue : this.mathscotItemService.getMathscotUrl(),
                              options: {
                                  x: mathscot.xValue ?? 740,
                                  y: mathscot.yValue ?? 270,
                                  scale: mathscot.scale ?? 0.55
                              }
                          }
                      ]
                    : [])
            ]);
        }

        return this.pdfService.createTrophyPDF(pdfFileName, drawData);
    }
}
