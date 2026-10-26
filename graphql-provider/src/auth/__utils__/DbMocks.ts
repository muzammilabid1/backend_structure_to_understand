import crypto from 'node:crypto';

import { PupilParentStatus, UserStatus } from 'lwp-shared';
import { ImportedSchool } from 'src/api/entities/imported_school';
import { LwpFeedbackReply } from 'src/api/entities/lwp_feedback_reply';
import { LwpPupilFeedback } from 'src/api/entities/lwp_pupil_feedback';
import { LwpPupilTag } from 'src/api/entities/lwp_pupil_tag';
import { LwpSticker } from 'src/api/entities/lwp_sticker';
import { LwpUserInterstitial } from 'src/api/entities/lwp_user_interstitial';
import { LwpUserPageAnnouncement } from 'src/api/entities/lwp_user_page_announcement';
import { LwpMagicLink } from 'src/api/entities/magic_link';
import { LwpPupil } from 'src/api/entities/pupil';
import { LwpPupilParent } from 'src/api/entities/pupil_parent';
import { LwpSchool } from 'src/api/entities/school';
import { LwpSchoolClass } from 'src/api/entities/school_class';
import { LwpUser } from 'src/api/entities/user';
import { LwpUserAssociatedLogin } from 'src/api/entities/user_associated_login';
import { LwpUserSession } from 'src/api/entities/user_session';
import { MagicLinkType, UserAssociatedLoginType } from 'src/api/model';
import { UserType } from 'src/auth/types/UserType';

import { StubRepository } from './StubRepository';
import { StubRepositoryContainer } from './StubRepositoryContainer';

type ExtraUserParams = Omit<Partial<LwpUser>, 'id' | 'userStatus'>;
export class DbMocks {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRepos: Record<string, StubRepository<any>>;

    constructor(mockRepos: StubRepositoryContainer) {
        this.mockRepos = mockRepos.repos();
    }

    public mockParent({
        pupils = 0 as number | LwpPupil[],
        status = UserStatus.ACTIVE,
        ppStatus = PupilParentStatus.ACTIVE,
        options = {} as ExtraUserParams
    } = {}): LwpUser {
        const user = this.createBaseUser(status, options);

        user.type = UserType.PARENT;

        let pupilsToAttach: LwpPupil[];

        if (Array.isArray(pupils)) {
            pupilsToAttach = pupils;
        } else {
            pupilsToAttach = [];
            for (let i = 0; i < pupils; i++) {
                const pupil = new LwpPupil();

                pupil.id = (0 - (i + 1)).toString();

                pupil.firstname = 'Test';
                pupil.lastname = 'Pupil';

                pupilsToAttach.push(pupil);
            }
        }

        pupilsToAttach.forEach((pupil) => {
            this.mockPupilParent(pupil, user, ppStatus);
        });

        return user;
    }

    public mockPupilParent(pupil: LwpPupil, parent: LwpUser, status = PupilParentStatus.ACTIVE): LwpPupilParent {
        const pp = new LwpPupilParent();

        pp.pupil = pupil;
        pp.pupilId = pupil.id;
        pp.parent = parent;
        pp.parentId = parent.id;
        pp.status = status;

        this.mockRepos.LwpPupilParent.save(pp);

        parent.pupils ||= [];
        parent.pupils.push(pp);

        pupil.parents ||= [];
        pupil.parents.push(pp);

        return pp;
    }

    public mockTeacher({
        classes = 0 as number | LwpSchoolClass[],
        leader = false,
        school = this.mockSchool(),
        status = UserStatus.ACTIVE,
        options = {} as ExtraUserParams
    } = {}): LwpUser {
        const user = this.createBaseUser(status, options);

        user.type = UserType.TEACHER;
        user.isSchoolLeader = leader;
        user.school = school;

        let classesToAttach: LwpSchoolClass[];

        if (Array.isArray(classes)) {
            classesToAttach = classes;
        } else {
            classesToAttach = [];
            for (let i = 0; i < classes; i++) {
                classesToAttach.push(this.mockClass(school, { teachers: [user] }));
            }
        }

        user.classes = classesToAttach;

        return user;
    }

    mockClass(school: LwpSchool, options = {} as Partial<Omit<LwpSchoolClass, 'id' | 'school'>>): LwpSchoolClass {
        const sClass = new LwpSchoolClass();

        sClass.school = school;

        Object.entries(options).forEach(([k, v]) => {
            sClass[k] = v;
        });

        this.mockRepos.LwpSchoolClass.save(sClass);

        return sClass;
    }

    mockPupil(school: LwpSchool): LwpPupil {
        const pupil = new LwpPupil();

        pupil.school = school;

        school.pupils.push(pupil);

        this.mockRepos.LwpPupil.save(pupil);

        return pupil;
    }

    mockSchool(): LwpSchool {
        const school = new LwpSchool();

        school.schoolName = 'Test School';
        school.pupils = [];

        this.mockRepos.LwpSchool.save(school);

        return school;
    }

    public mockImportedSchool(ls: LwpSchool): ImportedSchool {
        const ws = new ImportedSchool();

        ws.lwpSchool = ls;

        this.mockRepos.ImportedSchool.save(ws);

        return ws;
    }

    public mockSticker(school?: LwpSchool): LwpSticker {
        const sticker = new LwpSticker();

        sticker.school = school;

        this.mockRepos.LwpSticker.save(sticker);

        return sticker;
    }

    public mockPupilTag(school = this.mockSchool()): LwpPupilTag {
        const pupilTag = new LwpPupilTag();

        pupilTag.school = school;

        this.mockRepos.LwpPupilTag.save(pupilTag);

        return pupilTag;
    }

    public mockSession(user: LwpUser, sessionOptions: Omit<Partial<LwpUserSession>, 'userId'> = {}): LwpUserSession {
        const session = new LwpUserSession();

        session.userId = user.id;

        Object.entries(sessionOptions).forEach(([k, v]) => {
            session[k] = v;
        });

        this.mockRepos.LwpUserSession.save(session);

        return session;
    }

    public mockUserAssociatedLogin(user: LwpUser, accountId: string, accountType: UserAssociatedLoginType): LwpUserAssociatedLogin {
        const assocLogin = new LwpUserAssociatedLogin();

        assocLogin.user = user;
        assocLogin.accountId = accountId;
        assocLogin.accountType = accountType;

        this.mockRepos.LwpUserAssociatedLogin.save(assocLogin);

        return assocLogin;
    }

    public mockUserInterstitial(user: LwpUser): LwpUserInterstitial {
        const interstitial = new LwpUserInterstitial();

        interstitial.user = user;

        this.mockRepos.LwpUserInterstitial.save(interstitial);

        return interstitial;
    }

    public mockUserPageAnnouncement(user: LwpUser): LwpUserPageAnnouncement {
        const lwpUserPageAnnouncement = new LwpUserPageAnnouncement();

        lwpUserPageAnnouncement.user = user;

        this.mockRepos.LwpUserPageAnnouncement.save(lwpUserPageAnnouncement);

        return lwpUserPageAnnouncement;
    }

    mockPupilFeedback(userType: UserType, pupil = this.mockPupil(this.mockSchool())): LwpPupilFeedback {
        const pupilFeedback = new LwpPupilFeedback();

        pupilFeedback.userType = userType;
        pupilFeedback.pupil = pupil;

        this.mockRepos.LwpPupilFeedback.save(pupilFeedback);

        return pupilFeedback;
    }

    mockFeedbackReply(user: LwpUser): LwpFeedbackReply {
        const feedbackReply = new LwpFeedbackReply();

        feedbackReply.logCreatedBy = user;

        this.mockRepos.LwpFeedbackReply.save(feedbackReply);

        return feedbackReply;
    }

    public mockMagicLink(type: MagicLinkType, expiry?: Date, pupil = this.mockPupil(this.mockSchool()), user = null): LwpMagicLink {
        const link = new LwpMagicLink();

        link.url = crypto.randomBytes(20).toString('hex');
        link.pupil = pupil;
        link.pupilId = pupil.id;
        link.user = user ?? this.mockParent({ pupils: [pupil] });
        link.type = type;

        if (expiry) {
            link.expiryTime = expiry;
        } else {
            const futureDate = new Date();

            futureDate.setDate(futureDate.getDate() + 1);

            link.expiryTime = futureDate;
        }

        this.mockRepos.LwpMagicLink.save(link);

        return link;
    }

    private createBaseUser(status: UserStatus, options: ExtraUserParams): LwpUser {
        const user = new LwpUser();

        user.firstname = 'First';
        user.lastname = 'Last';
        user.email = `test${(Math.random() + 1).toString(36).substring(7)}@example.com`;

        Object.entries(options).forEach(([k, v]) => {
            user[k] = v;
        });

        user.userStatus = status;

        this.mockRepos.LwpUser.save(user);

        return user;
    }
}
