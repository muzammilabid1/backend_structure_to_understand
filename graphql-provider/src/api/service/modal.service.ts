import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import newrelic from 'newrelic/index';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';

import { StaticLwpActivityLegacy } from '../dtos/StaticLwpActivityLegacy';
import { StaticLwpActivitySteps } from '../entities/activity';
import { StaticLwpModal } from '../entities/modal';
import {
    ActivityStepInput,
    ActivityStepType,
    AddModalStepsInput,
    ErrorStatusCodeEnum,
    ModalInput,
    OperationStatus,
    UpdateActivityStepInput,
    UpdateModalInput,
    UpdateOpenCountInput
} from '../model';
import { SourceTypeForOpenCounter } from '../types/SourceTypeForOpenCounter';
import { HelperService } from './helper.service';
@Injectable()
export class ModalService {
    constructor(
        @InjectRepository(StaticLwpModal)
        private modalRepository: Repository<StaticLwpModal>,
        @InjectRepository(StaticLwpActivitySteps)
        private staticLwpActivityStepsRepository: Repository<StaticLwpActivitySteps>,
        private helperService: HelperService,
        private shallowUserService: ShallowUserService
    ) {}

    public async addModal(input: ModalInput, file: FileUpload[], userId: string): Promise<StaticLwpModal> {
        if (!input.steps) throw new HttpException('Steps are required.', ErrorStatusCodeEnum._535);
        let fileUploads = [];
        const modal = new StaticLwpModal();

        modal.name = input?.name;

        const shallowUser = this.shallowUserService.newShallowUser(userId);

        modal.logCreatedBy = shallowUser;
        modal.logUpdatedBy = shallowUser;

        if (input?.nameForContentDev) modal.nameForContentDev = input?.nameForContentDev;

        const modalRes = await this.modalRepository.save(modal);

        if (file && file.filter((f) => f).length) {
            fileUploads = await Promise.all(file);
        }

        await this.helperService.addStepFiles(input?.steps, fileUploads);

        const newSteps = await Promise.all(
            input?.steps
                .map((s) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { fileIdentifier, ...rest } = s;

                    return rest;
                })
                .map(async (step) => {
                    let properties = JSON.parse(step?.properties);

                    if (step.stepType === ActivityStepType.TEXTDICE) {
                        properties = await this.helperService.getTextDiceStepProperties(step?.properties, fileUploads);
                    }

                    return { ...step, modal: modalRes, properties };
                })
        );

        await this.staticLwpActivityStepsRepository.save(newSteps);

        return modalRes;
    }

    public async getModal(id: string): Promise<StaticLwpModal> {
        const modal = await this.modalRepository.findOne({ where: { id } });

        if (!modal) throw new HttpException('Modal does not exist', ErrorStatusCodeEnum._535);

        return modal;
    }

    public async getModals(): Promise<StaticLwpModal[]> {
        const modals = await this.modalRepository.find();

        return modals.length > 0 ? modals : [];
    }

    public async deleteModal(id: string): Promise<OperationStatus> {
        await this.deleteModalSteps(id);
        const res = await this.modalRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async deleteModalSteps(id: string): Promise<boolean> {
        const activitySteps = await this.staticLwpActivityStepsRepository.find({ where: { modal: { id } } });

        for (const step of activitySteps) {
            if (step.stepType === ActivityStepType.TEXT_AND_IMAGE) {
                await this.helperService.removeFile(`${appConstants.minioPaths.public.imageActivitySteps}/${step?.imageUrl}`, true);
            }

            if (step.stepType === ActivityStepType.DOWNLOAD) {
                await this.helperService.removeFile(`${appConstants.minioPaths.public.fileActivitySteps}/${step?.downloadUrl}`, true);
            }

            await this.staticLwpActivityStepsRepository.delete(step.id);
        }

        return true;
    }

    public async deleteModalStep(id: string): Promise<OperationStatus> {
        const res = await this.staticLwpActivityStepsRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async updateModal(input: UpdateModalInput, file: FileUpload[]): Promise<StaticLwpModal> {
        const modal = await this.modalRepository.findOne({ where: { id: input.id } });
        let fileUploads = [];

        if (!modal) throw new HttpException('Modal does not exist', ErrorStatusCodeEnum._535);
        modal.name = input.name ?? modal.name;

        // Left out keeps the stored title; empty or null clears it.
        if (input.nameForContentDev !== undefined) modal.nameForContentDev = input.nameForContentDev?.trim() || null;

        const newModal = await this.modalRepository.save(modal);

        if (!input?.steps?.length) {
            await this.deleteModalSteps(newModal?.id);
        }

        if (file && file.filter((f) => f).length) {
            fileUploads = await Promise.all(file);
        }

        if (input?.steps?.length > 0) {
            const steps = await this.staticLwpActivityStepsRepository.find({ where: { modal: { id: newModal?.id } } });

            await this.helperService.updateStepFiles(steps, input?.steps, fileUploads);

            const inputSteps = input.steps.filter((s) => s.isNew === true);

            if (inputSteps.length > 0) {
                await this.helperService.addStepFiles(inputSteps, fileUploads);

                const newSteps: Partial<StaticLwpActivitySteps>[] = await Promise.all(
                    inputSteps
                        .map((s) => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { isNew, fileIdentifier, ...rest } = s;

                            return rest;
                        })
                        .map(async (step) => {
                            let properties = JSON.parse(step?.properties);

                            if (step.stepType === ActivityStepType.TEXTDICE) {
                                properties = await this.helperService.getTextDiceStepProperties(step?.properties, fileUploads);
                            }

                            return { ...step, modal: newModal, properties };
                        })
                );

                await this.staticLwpActivityStepsRepository.save(newSteps);
            }
        }

        return newModal;
    }

    public async addModalSteps(input: AddModalStepsInput): Promise<StaticLwpModal> {
        const modal = await this.modalRepository.findOne({ where: { id: input.modalId } });

        if (!modal) throw new HttpException('Modal does not exist', ErrorStatusCodeEnum._535);

        // saving modal steps
        await this.addStepsForModal(input.steps, modal);

        return modal;
    }

    public async updateOpenCount(input: UpdateOpenCountInput): Promise<boolean> {
        try {
            if (input.type === SourceTypeForOpenCounter.MODAL) {
                await this.modalRepository.update({ id: input.id }, { openCount: () => '"openCount" + 1' });

                return true;
            } else {
                await this.staticLwpActivityStepsRepository.update(
                    { id: input.id, stepType: ActivityStepType.LINK },
                    { linkOpenCount: () => '"linkOpenCount" + 1' }
                );

                return true;
            }
        } catch (error) {
            newrelic.noticeError(error, { caught: true, handled: false });

            return false;
        }
    }

    public async updateLegacyActivityStep(input: UpdateActivityStepInput): Promise<StaticLwpActivitySteps> {
        const { id, stepType, order, text, imageUrl, downloadUrl, downloadName, linkName, linkUrl, properties } = input;
        const modalStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id: id } });

        if (!modalStep) throw new HttpException('Activity Step does not exist', ErrorStatusCodeEnum._535);
        switch (stepType) {
            case ActivityStepType.TEXT_AND_IMAGE:
                const textImageStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id: id } });

                textImageStep.order = order;
                textImageStep.stepType = ActivityStepType.TEXT_AND_IMAGE;
                textImageStep.text = text;
                textImageStep.imageUrl = imageUrl;

                return await this.staticLwpActivityStepsRepository.save(textImageStep);

            case ActivityStepType.DOWNLOAD:
                const downloadStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id: id } });

                downloadStep.order = order;
                downloadStep.stepType = ActivityStepType.DOWNLOAD;
                downloadStep.downloadName = downloadName;
                downloadStep.downloadUrl = downloadUrl;

                return await this.staticLwpActivityStepsRepository.save(downloadStep);

            case ActivityStepType.LINK:
                const linkStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id: id } });

                linkStep.order = order;
                linkStep.stepType = ActivityStepType.LINK;
                linkStep.linkName = linkName;
                linkStep.linkUrl = linkUrl;

                return await this.staticLwpActivityStepsRepository.save(linkStep);

            default:
                const diceStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id: id } });

                diceStep.order = order;
                diceStep.stepType = ActivityStepType.DICE;
                diceStep.properties = JSON.parse(properties);

                return await this.staticLwpActivityStepsRepository.save(diceStep);
        }
    }

    public async steps(modal: StaticLwpModal): Promise<StaticLwpActivityLegacy> {
        const steps = await this.staticLwpActivityStepsRepository.find({ where: { modal: { id: modal?.id } }, order: { order: 'ASC' } });

        const legacy = new StaticLwpActivityLegacy();

        legacy.legacySteps = steps.map((step) => ({
            ...step,
            downloadUrl: step.downloadUrl
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${step.downloadUrl}`)
                : null,
            imageUrl: step.imageUrl
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.imageActivitySteps}/${step.imageUrl}`)
                : null,
            audioUrl: step?.audioUrl
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${step.audioUrl}`)
                : null,
            carouselData: step?.carouselData?.length > 0 ? this.helperService.getCarouselData(step?.carouselData) : null,
            imageCarouselData:
                step?.imageCarouselData?.length > 0 ? this.helperService.getImageCarouselData(step?.imageCarouselData) : null,
            checklistImageData:
                step?.checklistImageData?.length > 0 ? this.helperService.getChecklistImageData(step?.checklistImageData) : null,
            properties:
                step?.stepType === ActivityStepType.TEXTDICE ? this.helperService.getTextDiceProperties(step?.properties) : step?.properties
        }));

        return legacy;
    }

    private async addStepsForModal(steps: [ActivityStepInput], modal: StaticLwpModal): Promise<StaticLwpActivitySteps[]> {
        const newSteps = steps.map((step) => ({ ...step, modal, properties: JSON.parse(step?.properties) }));

        return this.staticLwpActivityStepsRepository.save(newSteps);
    }

    public async duplicateModal(modalId: string, userId: string, nameForContentDev?: string): Promise<StaticLwpModal> {
        const modalToDuplicate = await this.modalRepository.findOne({ where: { id: modalId }, relations: ['steps'] });

        if (!modalToDuplicate) throw new HttpException('Activity does not exist', ErrorStatusCodeEnum._535);

        const modal = new StaticLwpModal();

        modal.name = modalToDuplicate.name;
        modal.nameForContentDev = nameForContentDev;

        const user = this.shallowUserService.newShallowUser(userId);

        modal.logCreatedBy = user;
        modal.logUpdatedBy = user;
        modal.steps = [];

        const duplicatedModal = await this.modalRepository.save(modal);

        if (modalToDuplicate?.steps?.length > 0) {
            const steps = await this.staticLwpActivityStepsRepository.find({ where: { modal: { id: modalToDuplicate?.id } } });

            await this.helperService.duplicateSteps(steps, duplicatedModal);
        }

        return duplicatedModal;
    }
}
