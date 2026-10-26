select
  ls.id,
  ls."schoolName",
  (case
    when ("importedSchoolId" is null or "importedSchoolId" = '') then 'No Wonde ID set'
    when "importStatus" = 'WRONG_ACADEMIC_YEAR' then 'Latest data is for previous academic year'
    when count("dateOfBirth") > 0 then 'Tech team to check' when "importStatus" = 'PERMISSION_NEED_UPDATING' then 'Need to update Wonde permissions'
    else 'Tech team to check'
  end) as status,
  (case
    when "skipAutoWondeImport" then 'No'
    else 'Yes'
  end) as "auto_import",
  count(*) as "pupils",
  count("dateOfBirth") as "dobs"
from
  lwp_school ls
  join imported_school ims on ims.id = ls."importedSchoolId"
  join imported_student imst on imst."schoolId" = ims.id
where not ls."inactive" and not ls."isTestSchool"
group by ls.id
having (ls."importStatus" != 'COMPLETE' or ls."skipAutoWondeImport")
