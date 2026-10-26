import { Field, ObjectType } from '@nestjs/graphql';
import { AdminField, AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn
} from 'typeorm';

import { StepUnion } from '../dtos/StaticLwpActivityLegacy';
import {
    AccordionDataOutputInput,
    ActivityStepVisibilityRules,
    ActivityType,
    CarouselData,
    checkListTextDataInput,
    LwpButtonType,
    SassoonFontType,
    SetByTeacherData
} from '../model';
import { TextDiceProperties } from '../service/helper.service';
import { LwpDemoActivityFeedback } from './demo_activity_feedback';
import { LwpSetByTeacherStepMedia } from './lwp_set_by_teacher_step_media';
import { StaticLwpModal } from './modal';
import { LwpPupilActivity } from './pupil-activity';
import { StaticLwpActivityTag } from './static_lwp_activity_tag';
import { StaticLwpTopic } from './static_topic';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpActivity, AdminWriteAllRead)
@Index('idx_unique_order_topic', ['order', 'topic'], { unique: true }) // for documentation
export class StaticLwpActivity extends BaseAuthorizerEntity {
    @Field({ nullable: false })
    @Column({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    name: string;

    @Field({ nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    resources: string;

    @OneToMany(() => LwpPupilActivity, (child) => child.activity)
    @Field(() => [LwpPupilActivity], { nullable: true })
    pupilActivities: LwpPupilActivity[];

    /** If this activity is worth stars */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    starValue: number;

    @ManyToOne(() => StaticLwpTopic, (child) => child.activities, { onDelete: 'SET NULL' })
    @Field(() => StaticLwpTopic, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    topic: StaticLwpTopic;

    /** The modal shown as this activity's "rationale" (Why are we doing this activity?). Reusable across activities. */
    @ManyToOne(() => StaticLwpModal, (modal) => modal.rationaleActivities, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => StaticLwpModal, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    rationaleModal: StaticLwpModal;

    @RelationId((activity: StaticLwpActivity) => activity.rationaleModal)
    rationaleModalId: string;

    /* We will extend this with more types later */
    @Field(() => ActivityType, { nullable: false })
    @Column()
    @AuthorizeField(UnrestrictedField)
    activityType: ActivityType;

    /** The order the activity gets displayed in on the topic page */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    order: number;

    @Field()
    @Column({ default: false })
    isHidden: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(UnrestrictedField)
    hidePhotoUpload: boolean;

    /** Message to display at the top of activity page */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    welcomeMessage: string;

    /** URL of the icon where the image can be found for the card */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    cardImage: string;

    // if the activityType is STATIC then we will have some activty details in this column
    // eg: {"activityComponentName":"GuessTheAnimal"}
    @Field({ nullable: true })
    @Column({ type: 'jsonb', nullable: true, array: false })
    @AuthorizeField(UnrestrictedField)
    details: string;

    @OneToMany(() => StaticLwpActivitySteps, (child) => child.activity, { nullable: true })
    @Field(() => StepUnion, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    steps: Array<typeof StepUnion>;
    /** Open question: how do we address activities */

    @OneToMany(() => LwpDemoActivityFeedback, (t) => t.activity)
    @Field(() => [LwpDemoActivityFeedback])
    @AuthorizeField(UnrestrictedField)
    demoActivityFeedback: LwpDemoActivityFeedback[];

    @ManyToMany(() => StaticLwpActivityTag, (child) => child.activities, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_activity_tags' })
    @Field(() => [StaticLwpActivityTag], { nullable: true })
    tags: StaticLwpActivityTag[];

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    deletedBy: LwpUser;

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
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;
}

@ObjectType()
@Entity()
// @TableInheritance({ column: { type: 'varchar', name: 'type' } })
@ActsAsAuthorizer(StaticLwpActivitySteps, AdminWriteAllRead)
export class StaticLwpActivitySteps extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    id: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    deletedBy: LwpUser;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    order: number;

    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    stepType: string;

    @ManyToOne(() => StaticLwpActivity, (child) => child.steps, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => StaticLwpActivity, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    activity: StaticLwpActivity;

    @ManyToOne(() => StaticLwpModal, (child) => child.steps, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => StaticLwpModal, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    modal: StaticLwpModal;

    // StaticLwpTextImageStep
    /* If text is empty, the image should be displayed full width. Otherwise 50% width on the right. */
    /** This can have HTML in it that should be rendered */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    text: string;

    /** May be empty */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    imageUrl: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    fileName: string;

    // StaticLwpDownloadStep
    /* Text to be displayed on the button to download the pdf */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    downloadName: string;

    /* Location of PDF file to download */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    downloadUrl: string;

    // StaticLwpLinkStep
    /* Displayed as a button which opens a new window/tab */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    linkName: string;

    @Column({ default: 0 })
    @Field()
    @AuthorizeField(AdminField)
    linkOpenCount: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    linkUrl: string;

    // StaticLwpDiceStep
    /* The name will match to a react component that we will need to build - future task */
    @Field(() => String, { nullable: true })
    @Column({ type: 'jsonb', nullable: true, array: false })
    @AuthorizeField(UnrestrictedField)
    properties: TextDiceProperties;

    // StaticLwpInfantFontStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    fontSize: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    fontType: SassoonFontType;

    // StaticLwpCarouselStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    textCarouselData: string;

    @Field(() => [CarouselData], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    carouselData: CarouselData[];

    // StaticLwpTableStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    tableData: string;

    // StaticLwpModalStep
    @Field({ nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    @AuthorizeField(UnrestrictedField)
    selectedModalId: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    btnType: LwpButtonType;

    // StaticLwpEditorStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    editorState: string;

    @Field({ nullable: true })
    @Column({ default: false })
    @AuthorizeField(UnrestrictedField)
    editAsHtml: boolean;

    // StaticLwpTimerStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    timerData: string;

    // StaticLwpImageCarouselStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    imageCarouselData: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    dimensions: string;

    // StaticLwpClickableModalStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    clickableAlphabetData: string;

    // StaticLwpStopwatchStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    includeSeconds: boolean;

    // StaticLwpAudioStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    audioUrl: string;

    // StaticLwpTabsStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    tabsData: string;

    // StaticLwpDigitalChecklistStep
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    checklistImageData: string;

    @Field(() => String, { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    accordionData: AccordionDataOutputInput[];

    @Field(() => String, { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    checkListTextData: checkListTextDataInput;

    @Field(() => SetByTeacherData, { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    setByTeacherData: SetByTeacherData;

    @OneToMany(() => LwpSetByTeacherStepMedia, (media) => media.step)
    @Field(() => [LwpSetByTeacherStepMedia], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    setByTeacherMedia: LwpSetByTeacherStepMedia[];

    /**
     * Who this step is shown to. Not tied to any single step type: see
     * ActivityStepVisibilityRules in model.ts for the shape and for how to extend it
     * without a migration.
     */
    @Field(() => ActivityStepVisibilityRules, { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    visibilityRules: ActivityStepVisibilityRules;
}
