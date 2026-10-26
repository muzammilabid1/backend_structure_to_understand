import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { OpType } from 'src/auth/types/OpType';

import { LogLwpContact } from '../entities/contact';
import { ContactInput, OperationStatus, UpdateContactInput } from '../model';
import { ContactService } from '../service/contact.service';

@Resolver(() => LogLwpContact)
export class ContactResolver {
    constructor(private contactService: ContactService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LogLwpContact])
    async allContacts(): Promise<LogLwpContact[]> {
        return await this.contactService.allContacts();
    }

    @AuthorizeEndpoint([LogLwpContact, OpType.Write, null])
    @Mutation(() => LogLwpContact)
    async addContact(
        @Args({ name: 'input', type: () => ContactInput }) input: ContactInput,
        @AuthInfo('sub') userId: string
    ): Promise<LogLwpContact> {
        return await this.contactService.addContact(input, userId);
    }

    @AuthorizeEndpoint([LogLwpContact, OpType.Write, 'input.id'])
    @Mutation(() => LogLwpContact)
    async updateContact(
        @Args({ name: 'input', type: () => UpdateContactInput }) input: UpdateContactInput,
        @AuthInfo('sub') userId: string
    ): Promise<LogLwpContact> {
        return await this.contactService.updateContact(input, userId);
    }

    @AuthorizeEndpoint([LogLwpContact, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteContact(@Args('id') id: string): Promise<OperationStatus> {
        return await this.contactService.deleteContact(id);
    }
}
