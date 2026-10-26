export default {
    hostedUrl: process.env.HOSTED_URL || 'localhost',
    port: process.env.PORT || 3006,
    minioUserAws: process.env.MINIO_USE_AWS === 'false' ? false : true,
    graphqlBase: process.env.GRAPHQL_BASE || 'http://localhost:3006'
};
