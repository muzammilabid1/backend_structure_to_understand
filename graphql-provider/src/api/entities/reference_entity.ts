// ​
// @Entity()
// @ObjectType()
// export class LwpPupil {
//   @PrimaryGeneratedColumn()
//   @Field({ nullable: false })
//   id: number;
// ​
//   @Column()
//   @Field({ nullable: false })
//   firstname: string;
// ​
//   @Column()
//   @Field({ nullable: false })
//   lastname: string;
// ​
//   @Field({ nullable: true })
//   fullname: string;
// ​
//   @ManyToOne(() => PupilClass, (c) => c.students)
//   @Field(() => PupilClass, { nullable: true })
//   pupilClass: PupilClass;
// ​
//   @ManyToMany(() => Parent, (child) => child.children)
//   @JoinTable({ name: 'parent_pupil' })
//   @Field(() => [Parent], { nullable: true })
//   parents: LwpParent[];
// ​
//   mathscot: LwpMathscot;
// ​
//   @CreateDateColumn()
//   createdAt: Date;
// ​
//   @UpdateDateColumn()
//   updatedAt: Date;
// }
// ​
// export class LwpMathscot {
//   id: number;
// ​
//   /**
//    * URL of where the generated mathscot picture can be found. Standard suffixes can be added for size variations?
//    * This should normally be generated when the mathscot is saved.
//    * We may need a cleanup operation to clear out any unused images so this may need to be a searchable column?
//    * Could be structured so that if this is blank the mathscot image needs generating based on the items (e.g. if it's for an older mathscot, or so files can be cleaned up if not accessed for a while).
//    */
//   urlBase: string;
// ​
//   /** The list of items added to the mathscot. This could be a string that needs to be parsed - the parsing would happen only for the page where the mathscot gets dressed up. */
//   items: json;
// }
// ​
// @ObjectType()
// @Entity()
// export class LwpParent {
//   @PrimaryGeneratedColumn()
//   @Field({ nullable: false })
//   id: number;
// ​
//   /** The user details for this parent. WARNING: May not be present if the parent has been invited for a child but not accepted. */
//   user: LwpUser;
// ​
//   /** Email address used to invite this parent. Only used when the parent does not have associated user data. */
//   invitedEmail: string;
//   invitedFirstname: string;
//   invitedLastname: string;
// ​
//   @Field({ nullable: false })
//   @Column()
//   email: string;
// ​
//   @Field({ nullable: true })
//   @Column()
//   firstname: string;
// ​
//   @Field({ nullable: true })
//   @Column()
//   lastname: string;
// ​
//   @Field(() => [Pupil], { nullable: true })
//   @ManyToMany(() => Pupil, (child) => child.parents)
//   children: LwpPupil[];
// ​
//   /** The children for which an invite has been sent to this parent, which they haven't yet accepted */
//   invitedChildren: LwpPupil[];
// ​
//   @CreateDateColumn()
//   createdAt: Date;
// ​
//   @UpdateDateColumn()
//   updatedAt: Date;
// }
// ​
// export class StaticLwpTopic {
//   id: number;
//   name: string;
// ​
//   /** ID of Vimeo video */
//   video: string;
// ​
//   /** URL of thumbnail to be displayed when the topic appears in the list */
//   videoThumb: string;
// ​
//   activities: LwpActivity[];

//   /** Description shown to the teacher */
//   teacherDescription: string;
// ​
//   /** Default message from teacher to appear on topic page */
//   defaultTeacherMessage: string;
// ​
//   /** Default message to be sent in an email when the topic is launched */
//   defaultEmailMessage: string;
// }
// ​
// export class LwpActivity {
//   id: number;
//   name: string;
// ​
//   /** If this activity is worth stars */
//   starValue: number;
// ​
//   /** Open question: how do we address activities */
// }
