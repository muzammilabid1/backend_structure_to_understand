import { constants } from 'lwp-shared';

export const baseUrl = Cypress.env('HOSTED_URL');
export const graphqlEndpoint = Cypress.env('GRAPHQL_ENDPOINT');

//Register

// function generateUserName() {
//     let username = '';
//     let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

//     for (let i = 0; i < 6; i++) username += alphabet.charAt(Math.floor(Math.random() * alphabet.length));

//     return username;
// }

export function generateUserEmail() {
    let domain = '@example.com';

    return generateFirstName().toLowerCase() + new Date().getTime() + domain;
}

export function generateUserMobile() {
    let code = '+447700900';
    let number = '0123456789';
    let cellNummber = '';

    for (let i = 0; i < 3; i++) cellNummber += number.charAt(Math.floor(Math.random() * number.length));

    return code + cellNummber;
}

export function generateRandomNumbers() {
    let numbersPool = '0123456789';
    let randomNumber = '';

    for (let i = 0; i < 3; i++) randomNumber += numbersPool.charAt(Math.floor(Math.random() * numbersPool.length));

    return randomNumber;
}

export function generateTeacherEmail() {
    let domain = '@example.com';

    return teacherFirstname.toLowerCase() + new Date().getTime() + domain;
}

//Generate Topic Name

function generateTopicName() {
    let topic = 'TOPIC';
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let topicName = '';

    for (let i = 0; i < 5; i++) topicName += alphabet.charAt(Math.floor(Math.random() * alphabet.length));

    return topicName + topic;
}

export function generateRandomString(limit = 10) {
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let string = '';

    for (let i = 0; i < limit; i++) string += alphabet.charAt(Math.floor(Math.random() * alphabet.length));

    return string;
}

//Parent email generation

export function generateParentEmail() {
    let domain = '@example.com';

    return parentFirstName.toLowerCase() + new Date().getTime() + domain;
}

//School Email

export function generateSchoolEmail() {
    let domain = '@example.com';

    return leaderFirstName.toLowerCase() + new Date().getTime() + domain;
}
//School teacher email

export function generateSchoolTeacherEmail() {
    let domain = '@example.com';

    return teacherFirstname.toLowerCase() + new Date().getTime() + domain;
}

//Topic Name
export const topicName = generateTopicName();
export const randomString = generateRandomString();
export const mockUPNPrefix = 'LWP_TESTING_';

const faker = require('faker');

// export let firstName = faker.name.firstName();

export const generateRandomName = () => faker.address.city();
export const generateFirstName = () => faker.name.firstName();
export const generateLastName = () => faker.name.lastName();
export const generateRandomNumber = () =>
    faker.datatype.number({
        min: 1,
        max: 100
    });

export let pupilFirstName = faker.name.firstName();
export let pupilLastName = faker.name.lastName();
export let parentFirstName = faker.name.firstName();
export let parentLastName = faker.name.lastName();

//School
export let schoolName = faker.address.city();
export let className = faker.address.city();
export let newTopicName = faker.address.city();
export let leaderFirstName = faker.name.firstName();
export let leaderlastName = faker.name.lastName();
export let schoolEmail = generateSchoolEmail();

//School Teacher
export let teacherFirstname = faker.name.firstName();
export let teacherLastname = faker.name.lastName();

export let userEmail = generateUserEmail();
export let userRepeatEmail = userEmail;
export const teacherEmail = generateTeacherEmail();

export let mobileNumber = generateUserMobile();
export const password = 'User123123123!';
export const repeatPassword = 'User123123123!';
// export const fullName = `${firstName} ${lastName}`;

//Parent email
export const parentEmail = 'parent@example.com';
export const parentFirstNameExample = 'Parent';
export const parentLastNameParent = 'Parent';

export const socialLoginMicrosoft = 'microsoft';
export const socialLoginGoogle = 'google';

export const parentPassword = 'letmein';
export const class1Name = 'Testing Class 1';
export const periodShortName = '2025-26';
export const lwpSchoolName = 'Learning With Parents';
export const shortText = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry';
export const longText =
    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.";

export const releaseDate = new Date().getDate();
// School Leader

export const schoolLeader = 'schoolleader@example.com';
export const schoolLeaderPasssword = 'letmein';
export const schoolLeaderFirstName = 'License';
export const schoolLeaderLastName = 'Leader';

//Parent email for invitation

export const parentEmailForInvitation = generateParentEmail();
export const inviteParentPass = 'letmein123123!';

//Admin eamil and password

export const admin = 'admin@example.com';
export const adminpassword = 'letmein';

//Wrong password

export const wrongPassword = 'Wrong123123123!';

//School Teacher
export const schoolTeacherEmail = 'teacher@example.com';
export const schoolTeacherPass = 'letmein';

//Admin for wonde
export const adminForWondeEmail = 'admin@example.com';
export const adminForWondePassword = 'letmein';

//Topics Names

export const fruitsNamesTopic = 'Fruits Names';
export const fruitsNamesActivity = 'Guess Fruits Names';

export const animalsNamesTopic = 'Animals Names';
export const animalsNamesActivity = 'Guess Animals Names';

export const playingGameTopic = 'Playing Games';
export const playingGameActivity = 'Tic Tak Toe Game';

//Admin News for leader and teacher

export const newsTitle = 'News Title';
export const newsDescription = 'News Description';

//Admin news for leader only

export const newsTitleForLeader = 'News Title For Leader Only';
export const newsDescriptionForLeader = 'New Description For Leader only';

//Admin news for teacher only

export const newsTitleForTeacher = 'News Title For Teacher Only';
export const newsDescriptionForTeacher = 'New Description For Teacher only';

export const NotificationType = {
    PUPILTOPIC: 'Send Pupil Topics',
    READING: 'Send Parent Reading Topic Release',
    INVITATION: 'User Requested Signup Link Email'
};

export const NotificationParameter = {
    MAGICID: 'MAGICID',
    REJECT_MAGICID: 'REJECT_MAGICID'
};

// export let lastName = faker.name.lastName();

// export let firstName = faker.Name.findName();

//  var firstName = faker.Name.findName();
//  cy.get("#firstName").type(firstName);

export const ACCESS_TOKEN_COOKIE = constants.ACCESS_TOKEN_COOKIE;
export const REFRESH_TOKEN_COOKIE = constants.REFRESH_TOKEN_COOKIE;
