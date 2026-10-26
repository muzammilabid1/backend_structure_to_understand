# install and build as separate stage for caching support
FROM node:22-alpine AS builder
WORKDIR /app
COPY ./package.json ./
RUN yarn install
COPY . .
RUN yarn build

# copy dist after build stage from above
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app ./

# Setup env values for being defined when run as docker container
ENV NODE_ENV production

# start up command to run at start of container
CMD ["yarn", "run", "start:prod"]


# to build
# docker build -t graphql-provider --file ./Dockerfile .

# to run docker image
# docker run --rm -e PORT=2000 -p 3002:2000 graphql-provider:latest