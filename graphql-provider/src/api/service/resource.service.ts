import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';

import { StaticLwpResource } from '../entities/resource';
import { ErrorStatusCodeEnum, OperationStatus, ResourceInput, UpdateResourceInput } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class ResourceService {
    constructor(
        @InjectRepository(StaticLwpResource)
        private resourceRepository: Repository<StaticLwpResource>,
        private helperService: HelperService,
        private shallowUserService: ShallowUserService
    ) {}

    public async addResource(input: ResourceInput, file: FileUpload[], userId: string): Promise<StaticLwpResource> {
        const user = this.shallowUserService.newShallowUser(userId);
        const resource = new StaticLwpResource();
        const { title, description, leaderOnly, download } = input;

        resource.title = title;
        resource.description = description;
        resource.leaderOnly = leaderOnly;
        resource.download = download;
        resource.logCreatedBy = user;
        resource.logUpdatedBy = user;

        if (file && file.filter((f) => f).length) {
            const fileUploads = await Promise.all(file);
            const filename = `${fileUploads[0].filename}`;

            await this.helperService.uploadFile(
                `${appConstants.minioPaths.public.teacherResources}/${filename}`,
                fileUploads[0],
                true,
                download
                    ? {
                          'Content-Type': 'binary/octet-stream'
                      }
                    : this.helperService.getFileMetaData(fileUploads[0].filename)
            );
            resource.file = filename;
        }

        return this.resourceRepository.save(resource);
    }

    public async updateResource(input: UpdateResourceInput, file: FileUpload[], userId: string): Promise<StaticLwpResource> {
        const user = this.shallowUserService.newShallowUser(userId);

        const resource = await this.resourceRepository.findOne({ where: { id: input.id }, relations: ['logCreatedBy'] });

        if (!resource) throw new HttpException('FAQ does not exist', ErrorStatusCodeEnum._535);
        const { title, description, leaderOnly } = input;

        resource.title = title;
        resource.description = description;
        resource.leaderOnly = leaderOnly;
        resource.logUpdatedBy = user;

        if (file && file.filter((f) => f).length) {
            const fileUploads = await Promise.all(file);
            const filename = `${fileUploads[0].filename}`;

            await this.helperService.uploadFile(
                `${appConstants.minioPaths.public.teacherResources}/${filename}`,
                fileUploads[0],
                true,
                resource?.download
                    ? {
                          'Content-Type': 'binary/octet-stream'
                      }
                    : this.helperService.getFileMetaData(fileUploads[0].filename)
            );
            resource.file = filename;
        }

        return this.resourceRepository.save(resource);
    }

    public async allResources(): Promise<StaticLwpResource[]> {
        const resources = await this.resourceRepository.find({ relations: ['logCreatedBy', 'logUpdatedBy'] });

        return resources.map((r) => {
            r.file = this.helperService.getPublicUrl(`${appConstants.minioPaths.public.teacherResources}/${r.file}`);

            return r;
        });
    }

    public async deleteResource(id: string): Promise<OperationStatus> {
        const res = await this.resourceRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
