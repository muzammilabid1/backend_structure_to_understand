import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { TeacherWriteAllRead } from 'src/auth/authorizers/TeacherWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn
} from 'typeorm';

import { StaticLwpActivitySteps } from './activity';
import { LwpClassTopic } from './class_topic';
import { LwpPupilTopic } from './pupil_topic';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@Unique('UQ_sbt_step_media_step_class_topic', ['step', 'classTopic'])
@ActsAsAuthorizer(LwpSetByTeacherStepMedia, TeacherWriteAllRead)
export class LwpSetByTeacherStepMedia extends BaseAuthorizerEntity {
    @ManyToOne(() => StaticLwpActivitySteps, (step) => step.setByTeacherMedia, { nullable: false, onDelete: 'CASCADE' })
    @Field(() => StaticLwpActivitySteps, { nullable: false })
    @Index()
    @AuthorizeField(UnrestrictedField)
    step: StaticLwpActivitySteps;

    @ManyToOne(() => LwpClassTopic, (classTopic) => classTopic.setByTeacherMedia, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpClassTopic, { nullable: true })
    @Index()
    @AuthorizeField(UnrestrictedField)
    classTopic: LwpClassTopic;

    @ManyToMany(() => LwpPupilTopic, (pupilTopic) => pupilTopic.setByTeacherMedia)
    @JoinTable({ name: 'lwp_pupil_topic_sbt_step_media' })
    @Field(() => [LwpPupilTopic], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilTopics: LwpPupilTopic[];

    @Field()
    @Column({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    filename: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    parentMessage: string | null;

    // Common Fields
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
    @Field(() => LwpUser)
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;
}
