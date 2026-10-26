// Locale-scoped import: loads only the English locale (~1s) instead of faker v5's whole
// locale set (~72s to bundle+load), which dominated Playwright launch on every spec that
// imports this file. See @faker-js/faker.
import { faker } from '@faker-js/faker/locale/en';

const domain = 'example.com';
export const admin = 'admin@example.com';
export const schoolLeader = 'schoolleader@example.com';
export const parent = 'parent@example.com';
export const teacher = 'teacher@example.com';
export const lwpSchoolName = 'Learning With Parents';
export const schoolClassName = 'Testing Class 1';
export const existingPupilFirstName = 'LWP 1';

export const password = 'letmein';
export const signupPassword = 'Letmein12345';
export const teacherSupportEmail = 'schools@learningwithparents.com';

export const mathsDomainId = '1';
export const englishDomainId = '2';
export const readyTeddyDomainId = '3';
export const moneySkillsDomainId = '4';

export const englishSubjectId = '1';
export const mathsSubjectId = '2';
export const readyTeddySubjectId = '3';
export const moneySkillsSubjectId = '4';

export const englishSubjectName = 'English';
export const mathsSubjectName = 'Maths';
export const readyTeddySubjectName = 'Ready teddy';
export const moneySkillsSubjectName = 'Money skills';

export const generateSchoolName = () => faker.commerce.productName();
export const generateFirstName = () => faker.person.firstName();
export const generateLastName = () => faker.person.lastName();
export const generateUserEmail = (firstname: string, lastname: string) =>
    faker.internet.email({ firstName: firstname, lastName: lastname, provider: domain }).toLowerCase();
export const generateClassName = () => faker.commerce.productName();
export const generateTopicName = () => faker.commerce.productName();
export const generateSentence = (wordCount = 2) => faker.lorem.sentence(wordCount);
export const generateUPN = (length = 8) => faker.string.alpha(length);
