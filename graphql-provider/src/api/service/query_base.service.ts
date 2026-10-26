import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PupilParentStatus } from 'lwp-shared';
import { Brackets, type EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

import { StaticLwpActivity } from '../entities/activity';
import { LwpClassTopic } from '../entities/class_topic';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilMathscot } from '../entities/pupil_mathscot';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilActivity } from '../entities/pupil-activity';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpInterstitial } from '../entities/static_lwp_interstitial';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpUser } from '../entities/user';
@Injectable()
export class QueryBaseService {
    constructor(
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupilParent)
        private pupilParentRepository: Repository<LwpPupilParent>,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpPupilActivity)
        private pupilActivityRepository: Repository<LwpPupilActivity>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(StaticLwpActivity)
        private staticLwpActivityRepository: Repository<StaticLwpActivity>,
        @InjectRepository(LwpClassTopic)
        private classTopicRepository: Repository<LwpClassTopic>,
        @InjectRepository(StaticLwpTopic)
        private topicRepository: Repository<StaticLwpTopic>,
        @InjectRepository(StaticLwpInterstitial)
        private staticLwpInterstitialRepository: Repository<StaticLwpInterstitial>,
        @InjectRepository(LwpPupilMathscot)
        private pupilMathscotRepository: Repository<LwpPupilMathscot>
    ) {}

    public pupilParentBase(pupilId: string, parentId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoin('user.pupils', 'pupils')
            .leftJoin('pupils.pupil', 'pupil')
            .where('user.id = :id', { id: parentId })
            .andWhere('pupil.id = :pupilId', { pupilId });
    }

    public pupilTeacherBase(pupilId: string, teacherId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('teacher')
            .leftJoinAndSelect('teacher.classes', 'classes')
            .leftJoinAndSelect('classes.pupils', 'pupils')
            .where('teacher.id = :id', { id: teacherId })
            .andWhere('pupils.id = :pupilId', { pupilId });
    }

    public pupilLeaderBase(pupilId: string, teacherId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('teacher')
            .leftJoinAndSelect('teacher.school', 'school')
            .leftJoinAndSelect('school.pupils', 'pupils')
            .where('teacher.id = :id', { id: teacherId })
            .andWhere('pupils.id = :pupilId', { pupilId });
    }

    public parentPupilsBase(parentId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.pupils', 'pupils')
            .leftJoinAndSelect('pupils.pupil', 'pupil')
            .where('user.id = :id', { id: parentId })
            .andWhere('pupils.status = :status', { status: PupilParentStatus.ACTIVE });
    }

    public interstitialFormUsersBase(staticLwpInterstitialFormId: string): SelectQueryBuilder<StaticLwpInterstitial> {
        return this.staticLwpInterstitialRepository
            .createQueryBuilder('interstitialForm')
            .leftJoinAndSelect('interstitialForm.users', 'users')
            .where('interstitialForm.id = :id', { id: staticLwpInterstitialFormId });
    }

    public pupilTopicsBase(parentId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.pupils', 'pupils')
            .leftJoinAndSelect('pupils.pupil', 'pupil')
            .leftJoinAndSelect('pupil.allTopics', 'allTopics')
            .leftJoinAndSelect('allTopics.topic', 'staticTopic')
            .where('user.id = :id', { id: parentId });
    }

    public pupilTopicsBaseForTopicAccessUser(parentId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.pupils', 'pupils')
            .leftJoinAndSelect('pupils.pupil', 'pupil')
            .leftJoinAndSelect('pupil.allTopics', 'allTopics')
            .leftJoinAndSelect('allTopics.topic', 'staticTopic')
            .where('user.id = :id', { id: parentId })
            .andWhere('pupils.status = :status', { status: PupilParentStatus.INVITED });
    }

    public newPupilTopicsBase(pupilId: string): SelectQueryBuilder<LwpPupil> {
        return this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoinAndSelect('pupil.allTopics', 'allTopics')
            .where('pupil.id = :id', { id: pupilId });
    }

    public pupilActivitiesBase(parentId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.children', 'children')
            .leftJoinAndSelect('children.activities', 'activities')
            .where('user.id = :parentId', { parentId });
    }

    public newPupilActivitiesBase(pupilId: string): SelectQueryBuilder<LwpPupil> {
        return this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoinAndSelect('pupil.activities', 'activities')
            .where('pupil.id = :pupilId', { pupilId });
    }

    public pupilTrophiesBase(parentId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.pupils', 'pupils')
            .leftJoinAndSelect('pupils.pupil', 'pupil')
            .leftJoinAndSelect('pupil.trophies', 'trophies')
            .leftJoinAndSelect('trophies.trophy', 'trophy')
            .where('user.id = :parentId', { parentId })
            .orderBy('trophy.order', 'ASC');
    }

    public pupilActivityFeedsBase(parentId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.pupils', 'pupils')
            .leftJoinAndSelect('pupils.pupil', 'pupil')
            .leftJoinAndSelect('pupil.activities', 'activities')
            .leftJoinAndSelect('activities.feedback', 'feedback')
            .select('feedback')
            .where('user.id = :parentId', { parentId })
            .andWhere('activities.feedback IS NOT NULL')
            .orderBy('feedback.logCreatedAt', 'DESC');
    }

    public newPupilActivityFeedsBase(): SelectQueryBuilder<LwpPupil> {
        return this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoinAndSelect('pupil.activities', 'activities')
            .leftJoinAndSelect('activities.feedback', 'feedback')
            .select('feedback')
            .where('activities.feedback IS NOT NULL')
            .orderBy('feedback.logCreatedAt', 'DESC');
    }

    // ####

    // public parentInvitedPupilsBase(parentId: string): Promise<any> {
    //     return this.userRepository
    //         .createQueryBuilder('user')
    //         .leftJoinAndSelect('user.invitedChildren', 'invitedChildren')
    //         .where('user.id = :id', { id: parentId });
    // }

    public parentImportedPupilsBase(parentId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.importedChildren', 'importedChildren')
            .where('user.id = :id', { id: parentId });
    }

    public schoolPupilsBase(schoolId: string): SelectQueryBuilder<LwpSchool> {
        return this.schoolRepository
            .createQueryBuilder('school')
            .leftJoinAndSelect('school.pupils', 'pupils')
            .where('school.id = :id', { id: schoolId });
    }

    public pupilTopicPupilBase(pupilTopicId: string): SelectQueryBuilder<LwpPupilTopic> {
        return this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
            .where('pupilTopic.id = :id', { id: pupilTopicId });
    }

    public pupilTopicTopicBase(pupilTopicId: string): SelectQueryBuilder<LwpPupilTopic> {
        return this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.topic', 'topic')
            .where('pupilTopic.id = :id', { id: pupilTopicId });
    }

    public classTopicTopicBase(classTopicId: string): SelectQueryBuilder<LwpClassTopic> {
        return this.classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoinAndSelect('classTopic.topic', 'topic')
            .where('classTopic.id = :id', { id: classTopicId });
    }

    public pupilClassesBase(pupilId: string, manager?: EntityManager): SelectQueryBuilder<LwpSchoolClass> {
        return (manager?.getRepository(LwpSchoolClass) ?? this.schoolClassRepository)
            .createQueryBuilder('class')
            .leftJoinAndSelect('class.pupils', 'pupils')
            .where('pupils.id = :id', { id: pupilId });
    }

    public pupilMathscotBase(pupilId: string): SelectQueryBuilder<LwpPupilMathscot> {
        return this.pupilMathscotRepository
            .createQueryBuilder('pupilMathscot')
            .leftJoinAndSelect('pupilMathscot.pupil', 'pupil')
            .where('pupil.id = :id', { id: pupilId });
    }

    public pupilTopicClassBase(pupilTopicId: string): SelectQueryBuilder<LwpPupilTopic> {
        return this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.classTopic', 'classTopic')
            .leftJoinAndSelect('classTopic.class', 'class')
            .where('pupilTopic.id = :id', { id: pupilTopicId });
    }

    public pupilTopicActivitiesBase(pupilTopicId: string): SelectQueryBuilder<LwpPupilTopic> {
        return this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.activities', 'activities')
            .leftJoinAndSelect('activities.activity', 'activity')
            .orderBy('activity.order', 'ASC')
            .where('pupilTopic.id = :id', { id: pupilTopicId });
    }

    public pupilTopicClassTopicBase(pupilTopicId: string): SelectQueryBuilder<LwpPupilTopic> {
        return this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.classTopic', 'classTopic')
            .where('pupilTopic.id = :id', { id: pupilTopicId });
    }

    public pupilActivityPupilBase(pupilActivityId: string): SelectQueryBuilder<LwpPupilActivity> {
        return this.pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoinAndSelect('pupilActivity.pupil', 'pupil')
            .where('pupilActivity.id = :id', { id: pupilActivityId });
    }

    public pupilActivityFeedbackBase(pupilActivityId: string): SelectQueryBuilder<LwpPupilActivity> {
        return this.pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoinAndSelect('pupilActivity.feedback', 'feedback')
            .where('pupilActivity.id = :id', { id: pupilActivityId })
            .andWhere('pupilActivity.feedback IS NOT NULL');
    }

    public pupilActivityStaticActivityBase(pupilActivityId: string): SelectQueryBuilder<LwpPupilActivity> {
        return this.pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoinAndSelect('pupilActivity.activity', 'activity')
            .where('pupilActivity.id = :id', { id: pupilActivityId })
            .andWhere('pupilActivity.activity IS NOT NULL');
    }

    public pupilActivityPupilTopicBase(pupilActivityId: string): SelectQueryBuilder<LwpPupilActivity> {
        return this.pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoinAndSelect('pupilActivity.topic', 'topic')
            .where('pupilActivity.id = :id', { id: pupilActivityId })
            .andWhere('pupilActivity.topic IS NOT NULL');
    }

    public staticActivityTopicBase(staticActivityId: string): SelectQueryBuilder<StaticLwpActivity> {
        return this.staticLwpActivityRepository
            .createQueryBuilder('activity')
            .leftJoinAndSelect('activity.topic', 'topic')
            .where('activity.id = :id', { id: staticActivityId });
    }

    public schoolClassPupilBase(schoolClassId: string): SelectQueryBuilder<LwpSchoolClass> {
        return this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoinAndSelect('schoolClass.pupils', 'pupils')
            .where('schoolClass.id = :id', { id: schoolClassId });
    }

    public schoolClassTeachersBase(schoolClassId: string): SelectQueryBuilder<LwpSchoolClass> {
        return this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoinAndSelect('schoolClass.teachers', 'teachers')
            .where('schoolClass.id = :id', { id: schoolClassId });
    }

    public schoolClassMainTeacherBase(schoolClassId: string): SelectQueryBuilder<LwpSchoolClass> {
        return this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoinAndSelect('schoolClass.mainTeacher', 'mainTeacher')
            .where('schoolClass.id = :id', { id: schoolClassId });
    }

    public schoolClassSchoolBase(schoolClassId: string): SelectQueryBuilder<LwpSchoolClass> {
        return this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoinAndSelect('schoolClass.school', 'school')
            .where('schoolClass.id = :id', { id: schoolClassId });
    }

    public schoolClassYearGroupBase(schoolClassId: string): SelectQueryBuilder<LwpSchoolClass> {
        return this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoinAndSelect('schoolClass.yearGroup', 'yearGroup')
            .where('schoolClass.id = :id', { id: schoolClassId });
    }

    public schoolClassImportedClassBase(schoolClassId: string): SelectQueryBuilder<LwpSchoolClass> {
        return this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoinAndSelect('schoolClass.importedSchoolClass', 'importedSchoolClass')
            .where('schoolClass.id = :id', { id: schoolClassId });
    }

    public schoolLeadersBase(schoolClassId: string): SelectQueryBuilder<LwpSchool> {
        return this.schoolRepository
            .createQueryBuilder('school')
            .leftJoinAndSelect('school.schoolLeaders', 'schoolLeaders')
            .where('school.id = :id', { id: schoolClassId });
    }

    public schoolClassesBase(schoolId: string): SelectQueryBuilder<LwpSchool> {
        return this.schoolRepository
            .createQueryBuilder('school')
            .leftJoinAndSelect('school.classes', 'classes')
            .where('school.id = :id', { id: schoolId });
    }

    public teacherClassesBase(teacherId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('teacher')
            .leftJoinAndSelect('teacher.classes', 'classes')
            .leftJoinAndSelect('classes.parentClass', 'mainClass')
            .leftJoinAndSelect('mainClass.teachers', 'mainClassTeacher')
            .andWhere(
                new Brackets((qb) => {
                    qb.where(`teacher.id = ${teacherId}`).orWhere(`mainClassTeacher.id = ${teacherId}`);
                })
            );
    }

    public teacherMainClassesBase(teacherId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('teacher')
            .leftJoinAndSelect('teacher.mainClasses', 'mainClasses')
            .where('teacher.id = :id', { id: teacherId });
    }

    public TeacherLikedActivityFeedsBase(teacherId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('teacher')
            .leftJoinAndSelect('teacher.likedActivities', 'likedActivities')
            .where('teacher.id = :id', { id: teacherId })
            .orderBy('likedActivities.logCreatedAt', 'DESC');

        // return teacherClassBase
        // .leftJoinAndSelect('classes.pupils', 'pupils')
        // .leftJoinAndSelect('pupils.activities', 'activities')
        // .leftJoinAndSelect('activities.feedback', 'feedback')
        // .andWhere('activities.feedback IS NOT NULL')
        // .orderBy('feedback.logCreatedAt', 'DESC');
    }

    public TeacherSchoolBase(teacherId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('teacher')
            .leftJoinAndSelect('teacher.school', 'school')
            .where('teacher.id = :id', { id: teacherId });
    }

    public userInterstitialFormBase(userId: string): SelectQueryBuilder<LwpUser> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.showInterstitial', 'showInterstitial')
            .where('user.id = :id', { id: userId });
    }

    public pupilSchoolBase(pupilId: string): SelectQueryBuilder<LwpPupil> {
        return this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoinAndSelect('pupil.school', 'school')
            .where('pupil.id = :id', { id: pupilId });
    }

    // ## will remove pupilParentsBase and replace it from pupilParentsBase1

    public pupilParentsBase(pupilId: string): SelectQueryBuilder<LwpPupilParent> {
        return this.pupilParentRepository
            .createQueryBuilder('pupilParent')
            .leftJoinAndSelect('pupilParent.pupil', 'pupil')
            .where('pupil.id = :id', { id: pupilId });
    }

    // public pupilParentsBase(pupilId: string): Promise<any> {
    //     return this.userRepository
    //         .createQueryBuilder('parent')
    //         .leftJoinAndSelect('parent.children', 'children')
    //         .where('children.id = :id', { id: pupilId });
    // }

    // ####

    // public pupilAllParentsBase(pupilId: string): Promise<any> {
    //     return this.userRepository
    //         .createQueryBuilder('parent')
    //         .leftJoinAndSelect('parent.children', 'children')
    //         .leftJoinAndSelect('parent.invitedChildren', 'invitedChildren')
    //         .leftJoinAndSelect('parent.importedChildren', 'importedChildren')
    //         .where('children.id = :id', { id: pupilId });
    // }

    // public pupilInvitedParentsBase(pupilId: string): Promise<any> {
    //     return this.pupilRepository
    //         .createQueryBuilder('pupil')
    //         .leftJoinAndSelect('pupil.invitedParents', 'invitedParents')
    //         .where('pupil.id = :id', { id: pupilId });
    // }

    public pupilImportedParentsBase(pupilId: string): SelectQueryBuilder<LwpPupil> {
        return this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoinAndSelect('pupil.importedParents', 'importedParents')
            .where('pupil.id = :id', { id: pupilId });
    }

    public pupilWondeStudentBase(pupilId: string): SelectQueryBuilder<LwpPupil> {
        return this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoinAndSelect('pupil.importedStudent', 'importedStudent')
            .where('pupil.id = :id', { id: pupilId });
    }

    public allTopicsBase(): SelectQueryBuilder<StaticLwpTopic> {
        return this.topicRepository.createQueryBuilder('topics').leftJoinAndSelect('topics.domain', 'domain');
    }

    public topicDomainBase(topicId: string): SelectQueryBuilder<StaticLwpTopic> {
        return this.topicRepository
            .createQueryBuilder('topic')
            .leftJoinAndSelect('topic.domain', 'domain')
            .where('topic.id = :id', { id: topicId });
    }

    public topicYearGroupsBase(topicId: string): SelectQueryBuilder<StaticLwpTopic> {
        return this.topicRepository
            .createQueryBuilder('topic')
            .leftJoinAndSelect('topic.yearGroups', 'yearGroups')
            .where('topic.id = :id', { id: topicId });
    }
}
