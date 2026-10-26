FROM node:22

RUN apt-get update && \
    apt-get -y install postgresql postgresql-contrib

RUN yarn global add pm2

WORKDIR /var/www/platform

ENTRYPOINT ["tail", "-f", "/dev/null"]
