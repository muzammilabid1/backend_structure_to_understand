import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { ImportedType } from '../model';
import { ImportedContact } from './imported_contact';
import { ImportedSchool } from './imported_school';
import { ImportedStudent } from './imported_student';

@Entity()
@ObjectType()
@ActsAsAuthorizer(ImportedStudentContact, Delegate(() => ImportedSchool, 'school'))
export class ImportedStudentContact extends BaseAuthorizerEntity {
    @ManyToOne(() => ImportedStudent, (s) => s.importedStudentContacts, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => ImportedStudent, { nullable: true })
    @AuthorizeField(TeacherField)
    @Index(['importedStudent.id'])
    importedStudent?: ImportedStudent;

    @ManyToOne(() => ImportedContact, (s) => s.importedStudentContacts, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => ImportedContact, { nullable: true })
    @AuthorizeField(TeacherField)
    @Index(['importedContact.id'])
    importedContact?: ImportedContact;

    @ManyToOne(() => ImportedSchool, (school) => school.importedStudentContacts, { nullable: false, onDelete: 'CASCADE' })
    @Field(() => ImportedSchool, { nullable: true })
    @AuthorizeField(TeacherField)
    @Index(['school.id'])
    school?: ImportedSchool;

    @Column({ default: 'WONDE' })
    @Field(() => ImportedType)
    @AuthorizeField(TeacherField)
    importedFrom: ImportedType;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    bill_payer: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    lives_with_pupil: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    email_bills: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    copy_bills: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    court_order: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    pupil_report: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    parental_responsibility: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    correspondence: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    email_notification: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    sms_notification: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    mail_notification: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    push_notification: boolean;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    in_touch_communication: boolean;

    @Column({ nullable: true })
    @Field(() => Number, { nullable: true })
    @AuthorizeField(TeacherField)
    priority: number;

    @Column({ nullable: true })
    @Field(() => String, { nullable: true })
    @AuthorizeField(TeacherField)
    relationship: string;

    // Common Fields - in future we will reduce this duplication

    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

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
