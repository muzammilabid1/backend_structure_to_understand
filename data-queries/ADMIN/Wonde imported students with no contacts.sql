select
    is2.id as "Wonde school ID",
    is2."lwpSchoolId" as "LWP school ID",
    is2.name as "Wonde school name",
    count(1) filter (where ic.id is null) as "Num imported Wonde students without Wonde contacts",
    count(1) filter (where ic."lwpUserId" is null) as "Num imported Wonde students without LWP parents",
    count(1) filter (where ws."lwpPupilId" is not null and ic."lwpUserId" is null) as "Num imported LWP pupils without contacts",
    max(ws."lwpPupilId") filter (where ic.id is null) as "Example LWP pupil without Wonde contact",
    max(ws."lwpPupilId") filter (where ic."lwpUserId" is null) as "Example LWP pupil without LWP parent"
from
    imported_student ws
    left join imported_student_contact isc on ws.id = isc."importedStudentId"
    left join imported_contact ic on isc."importedContactId" = ic.id
    join imported_school is2 on ws."schoolId" = is2.id
group by
    is2.id
order by
    count(1) filter (where ic."lwpUserId" is null) desc;