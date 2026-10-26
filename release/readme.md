# Release Process
## Basics

### Build
The build process in AWS (and other services) uses the buildspec.yml file in the root. This document outlines the steps necessary to build the application. All the items are shell commands that execute as part of each phase.

For the AWS release process the buildspec creates a package that is uploaded to AWS S3 which the name of the build type and the build number so the package can be inspected if necessary. The build process then launches the virtual machines that build themselves based on the package.

### Server setup
The servers are divided into frontend and backend and build themselves based on the build type using the shell scripts in the build type folder.

## Release Stages

### Buildspec
#### Install and pre_build
This stage installs all the necessary files by updating node, installing yarn, and running yarn install.
#### Build
Here we run the build, create the service files, and package them into a .tar.gz file.
#### Post_build
Here the file is uploaded to S3 and then the proper shell script is executed that will build the virtual machines. They are launched into the proper VPC and are based on templates.

For staging, if there is no database, it will be created from the latest snapshot of production.

### Server Build
#### Basics and shared setup
The server receives user-data when it is launched with the environment variables that tell it which type to build, which database to connect to, and what needs to run.

The main shared setup does all the linux updates and installs node and yarn. All the servers run the code as a service using systemctl. The .service files contain everything that is needed to run the service including the environment variables as they were built on the build server.

#### Backend
On dev servers this will run the lwp_notification.service which does both the backend and notification.

On staging and production this will run lwp_backend.service.

The last part of the script will register the machine with the appropriate load balancer

#### Frontend
This server will run the lwp_frontend.service which has the connection to the frontend api. It is rebuilt on the machine so that the correct api values are set.

#### Notification
This server is only created for staging and production and is not registered with the load balancer. It is also responsible for running the database migration since only one of these is ever created. It will run the lwp_notification.service.

## Other files
- development_env.json and production_env.json contain the structure of those VPCs and were used to generate them. They are here in case it is necessary to move everything to another AWS account.
- instance.user-data is used as the base for user data for every server. It is read in during server creation.

## Endpoint and Resources
### Production
- Main URL: https://explore.learningwithparents.com
- API URL: https://api.learningwithparents.com/graphql

### Staging
- Main URL: https://explore.learningwithparents.com:8081
- API URL: https://api.learningwithparents.com:8081/graphql

### Development
- Main URL: http://dev.learningwithparents.com
- API URL: http://dev.learningwithparents.com:81/graphql
