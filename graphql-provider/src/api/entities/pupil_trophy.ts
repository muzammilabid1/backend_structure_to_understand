import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { LwpPupil } from './pupil';
import { LwpSchoolClass } from './school_class';
import { StaticLwpTrophy } from './static_trophy';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpPupilTrophy, Delegate(() => LwpPupil, 'pupil'))
@Index(['pupil.id', 'trophy.id'], { unique: true })
export class LwpPupilTrophy extends BaseAuthorizerEntity {
    @ManyToOne(() => LwpSchoolClass, (c) => c.trophies, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpSchoolClass, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    schoolClass: LwpSchoolClass;

    @ManyToOne(() => StaticLwpTrophy, (t) => t.trophies, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpTrophy, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    trophy: StaticLwpTrophy;

    @ManyToOne(() => LwpPupil, (t) => t.trophies, { onDelete: 'CASCADE' })
    @Field(() => LwpPupil, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupil: LwpPupil;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastCertificateEmailSent: Date;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastCertificateDownloaded: Date;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
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

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser, { nullable: true })
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;
}
