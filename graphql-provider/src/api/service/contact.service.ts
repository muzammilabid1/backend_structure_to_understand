import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { LogLwpContact } from '../entities/contact';
import { LwpUser } from '../entities/user';
import { ContactInput, ErrorStatusCodeEnum, OperationStatus, UpdateContactInput } from '../model';
import { NotificationService } from './notification.service';
import { ParameterService } from './parameter.service';

@Injectable()
export class ContactService {
    constructor(
        @InjectRepository(LogLwpContact)
        private contactRepository: Repository<LogLwpContact>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        private readonly notificationService: NotificationService,
        private shallowUserService: ShallowUserService,
        private parameterService: ParameterService
    ) {}

    public async addContact(input: ContactInput, userId: string): Promise<LogLwpContact> {
        const user = await this.userRepository.findOne(userId);
        const contact = new LogLwpContact();
        const { question } = input;

        contact.question = question;
        contact.logCreatedBy = user;
        contact.logUpdatedBy = user;

        // Send question to user
        await this.notificationService.sendQuestionToUser(user, question, true);

        // Send question to LWP Staff
        const adminEmail = (await this.parameterService.getParameterByKey('ADMIN_EMAIL_FOR_PURCHASE_LICENCE'))?.value ?? '';

        await this.notificationService.sendQuestionToLwpStaff(user, question, adminEmail, true);

        return this.contactRepository.save(contact);
    }

    public async updateContact(input: UpdateContactInput, userId: string): Promise<LogLwpContact> {
        const contact = await this.contactRepository.findOne({ where: { id: input.id } });

        if (!contact) throw new HttpException('FAQ does not exist', ErrorStatusCodeEnum._535);
        const { question } = input;

        contact.question = question;
        contact.logUpdatedBy = this.shallowUserService.newShallowUser(userId);

        return this.contactRepository.save(contact);
    }

    public async allContacts(): Promise<LogLwpContact[]> {
        const Contacts = await this.contactRepository.find();

        return Contacts;
    }

    public async deleteContact(id: string): Promise<OperationStatus> {
        const res = await this.contactRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
