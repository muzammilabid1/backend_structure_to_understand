import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { ImportedType, WondeGender } from '../model';
import { ImportedSchool } from './imported_school';
import { ImportedStudentContact } from './imported_student_contact';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(ImportedContact, Delegate(() => ImportedSchool, 'school'))
export class ImportedContact extends BaseAuthorizerEntity {
    // This is wonde id
    @PrimaryColumn()
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    email?: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    phoneNumber?: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    forename: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    surname: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    initials: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    legal_surname: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    legal_forename: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    title: string;

    @Column({ default: 'WONDE' })
    @Field(() => ImportedType)
    @AuthorizeField(TeacherField)
    importedFrom: ImportedType;

    @Field(() => WondeGender, { nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    gender?: WondeGender;

    @ManyToOne(() => LwpUser, (u) => u.importedContacts, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpUser, { nullable: true })
    @AuthorizeField(TeacherField)
    @Index(['lwpUser.id'])
    lwpUser?: LwpUser;

    @OneToMany(() => ImportedStudentContact, (s) => s.importedContact)
    @Field(() => [ImportedStudentContact], { nullable: true })
    @AuthorizeField(TeacherField)
    importedStudentContacts: ImportedStudentContact[];

    @ManyToOne(() => ImportedSchool, (school) => school.importedContacts, { nullable: false, onDelete: 'CASCADE' })
    @Field(() => ImportedSchool, { nullable: true })
    @AuthorizeField(TeacherField)
    @Index(['school.id'])
    school: ImportedSchool;

    getFullName(): string {
        return `${this.forename ?? '[Unknown]'} ${this.surname ?? '[Unknown]'}`;
    }

    // Common Fields - in future we will reduce this duplication
    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    logUpdatedAt: Date;
}
