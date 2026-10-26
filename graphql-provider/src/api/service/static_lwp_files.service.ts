import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { appConstants } from '../../constants';
import { StaticLwpFiles } from '../entities/static_lwp_files';
import { ErrorStatusCodeEnum, OperationStatus } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class StaticLwpFileService {
    constructor(
        @InjectRepository(StaticLwpFiles)
        private adminFileRepository: Repository<StaticLwpFiles>,
        private helperService: HelperService,
        private shallowUserService: ShallowUserService
    ) {}

    public async addAFile(download: boolean, file: FileUpload[], userId: string): Promise<string> {
        const staticFile = new StaticLwpFiles();

        staticFile.download = download;

        const user = this.shallowUserService.newShallowUser(userId);

        staticFile.logCreatedBy = user;
        staticFile.logUpdatedBy = user;

        if (file && file.filter((f) => f).length) {
            const fileUploads = await Promise.all(file);

            staticFile.filename = `${new Date().getTime()}_${fileUploads[0].filename}`;

            await this.helperService.uploadFile(
                `${appConstants.minioPaths.public.adminResources}/${staticFile.filename}`,
                fileUploads[0],
                true,
                download
                    ? {
                          'Content-Type': 'binary/octet-stream'
                      }
                    : this.helperService.getFileMetaData(fileUploads[0].filename)
            );
        }

        await this.adminFileRepository.save(staticFile);

        return this.helperService.getPublicUrl(`${appConstants.minioPaths.public.adminResources}/${staticFile.filename}`);
    }

    public async getAllFiles(): Promise<StaticLwpFiles[]> {
        let staticFiles = await this.adminFileRepository.find();

        if (!staticFiles) throw new HttpException('File does not exist', ErrorStatusCodeEnum._535);

        staticFiles = staticFiles.map((file) => {
            file.filename = file.filename
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.adminResources}/${file.filename}`)
                : null;

            return file;
        });

        return staticFiles;
    }

    public async getAFile(staticFileId: string): Promise<StaticLwpFiles> {
        const staticFile = await this.adminFileRepository.findOne({ where: { id: staticFileId } });

        if (!staticFile) throw new HttpException('File does not exist', ErrorStatusCodeEnum._535);

        staticFile.filename = staticFile.filename
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.adminResources}/${staticFile.filename}`)
            : null;

        return staticFile;
    }

    public async deleteAFile(id: string): Promise<OperationStatus> {
        const file = await this.adminFileRepository.findOne({ where: { id } });

        if (!file) throw new HttpException('File does not exist', ErrorStatusCodeEnum._535);

        await this.helperService.removeFile(`${appConstants.minioPaths.public.adminResources}/${file.filename}`, true);

        const res = await this.adminFileRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
