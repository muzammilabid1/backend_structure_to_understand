import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { nanoid } from 'nanoid';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';

import { StaticLwpProgram } from '../entities/static_lwp_program';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { CreateNewProgramInput, ErrorStatusCodeEnum, OperationStatus, UpdateProgramInput } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class StaticLwpProgramService {
    constructor(
        @InjectRepository(StaticLwpProgram)
        private lwpProgramRepository: Repository<StaticLwpProgram>,
        @InjectRepository(StaticLwpSchoolTag)
        private lwpSchoolTagRepository: Repository<StaticLwpSchoolTag>,
        private helperService: HelperService,
        private shallowUserService: ShallowUserService
    ) {}

    private handlePartnerProgramError(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        err: any,
        schoolConflictMessage: string = 'Some schools are already linked to an existing partner program through another tag. Each school can be linked to only one partner program at a time',
        tagConflictMessage: string = 'This tag is already linked to an existing partner program. Each tag can only be associated with one program'
    ): void {
        if (err?.constraint?.includes('idx_unique_school_isprogramtag')) {
            throw new HttpException(schoolConflictMessage, ErrorStatusCodeEnum._535);
        } else if (err?.constraint?.includes('idx_schoolTag_where_not_deleted')) {
            throw new HttpException(tagConflictMessage, ErrorStatusCodeEnum._535);
        }

        throw err; // Re-throw if it's an unexpected error
    }

    public async createNewProgram(
        input: CreateNewProgramInput,
        logo: FileUpload,
        character: FileUpload,
        userId: string
    ): Promise<StaticLwpProgram> {
        try {
            const user = this.shallowUserService.newShallowUser(userId);

            const newProgram = new StaticLwpProgram();

            if (input.schoolTagId) {
                const schoolTag = await this.lwpSchoolTagRepository.findOne(input.schoolTagId);

                if (!schoolTag) throw new HttpException('School tag does not exist', ErrorStatusCodeEnum._535);

                newProgram.schoolTag = schoolTag;
            }

            if (logo) {
                const filename = `${nanoid()}.png`;

                await this.helperService.uploadFile(`${appConstants.minioPaths.public.uploadedProgramLogo}/${filename}`, logo, true);

                newProgram.logoFileName = filename;
            }

            if (character) {
                const filename = `${nanoid()}.png`;

                await this.helperService.uploadFile(
                    `${appConstants.minioPaths.public.uploadedProgramCharacter}/${filename}`,
                    character,
                    true
                );

                newProgram.characterFileName = filename;
            }

            newProgram.name = input.name;
            newProgram.logCreatedBy = user;

            return await this.lwpProgramRepository.save(newProgram);
        } catch (err) {
            this.handlePartnerProgramError(err);
        }
    }

    public async uploadLogoAndCharacterHelper(file: FileUpload, existingFileName: string, uploadPath: string): Promise<string> {
        if (existingFileName) {
            await this.helperService.removeFile(`${uploadPath}/${existingFileName}`, true);
        }

        const filename = `${nanoid()}.png`;

        await this.helperService.uploadFile(`${uploadPath}/${filename}`, file, true);

        return filename;
    }

    public async updateProgram(
        input: UpdateProgramInput,
        logo: FileUpload,
        character: FileUpload,
        userId: string
    ): Promise<StaticLwpProgram> {
        try {
            const lwpProgram = await this.lwpProgramRepository.findOneOrFail(input.id);

            const user = this.shallowUserService.newShallowUser(userId);

            if (input.schoolTagId) {
                const schoolTag = await this.lwpSchoolTagRepository.findOne(input.schoolTagId);

                if (!schoolTag) throw new HttpException('School tag does not exist', ErrorStatusCodeEnum._535);

                lwpProgram.schoolTag = schoolTag;
            } else {
                lwpProgram.schoolTag = null;
            }

            if (logo) {
                const filename = await this.uploadLogoAndCharacterHelper(
                    logo,
                    lwpProgram.logoFileName,
                    appConstants.minioPaths.public.uploadedProgramLogo
                );

                lwpProgram.logoFileName = filename;
            } else if (input.removeLogo && lwpProgram.logoFileName) {
                await this.helperService.removeFile(
                    `${appConstants.minioPaths.public.uploadedProgramLogo}/${lwpProgram.logoFileName}`,
                    true
                );
                lwpProgram.logoFileName = null;
            }

            if (character) {
                const filename = await this.uploadLogoAndCharacterHelper(
                    character,
                    lwpProgram.characterFileName,
                    appConstants.minioPaths.public.uploadedProgramCharacter
                );

                lwpProgram.characterFileName = filename;
            } else if (input.removeCharacter && lwpProgram.characterFileName) {
                await this.helperService.removeFile(
                    `${appConstants.minioPaths.public.uploadedProgramCharacter}/${lwpProgram.characterFileName}`,
                    true
                );
                lwpProgram.characterFileName = null;
            }

            lwpProgram.name = input.name;
            lwpProgram.logCreatedBy = user;

            return await this.lwpProgramRepository.save(lwpProgram);
        } catch (err) {
            this.handlePartnerProgramError(err);
        }
    }

    public async getProgramsForAdmin(): Promise<StaticLwpProgram[]> {
        return this.lwpProgramRepository
            .createQueryBuilder('program')
            .leftJoinAndSelect('program.schoolTag', 'schoolTag')
            .orderBy('program.name', 'ASC')
            .getMany();
    }

    public async removeProgram(id: string): Promise<OperationStatus> {
        const res = await this.lwpProgramRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
