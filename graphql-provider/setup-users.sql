CREATE ROLE "lwpUser";
ALTER ROLE "lwpUser" WITH PASSWORD 'docker' LOGIN;
CREATE ROLE "lwpAdminUser";
ALTER ROLE "lwpAdminUser" WITH PASSWORD 'docker' LOGIN;
