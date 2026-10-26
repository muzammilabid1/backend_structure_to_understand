export default {
    minio_host: process.env.ULTIMA_BUCKET_HOST || 'localhost',
    minio_region: process.env.ULTIMA_BUCKET_REGION || 'us-east-1',
    minio_port: parseInt(process.env.ULTIMA_BUCKET_PORT || '9000'),
    minio_key: process.env.ULTIMA_BUCKET_ACCESS_KEY_ID || 'key123',
    minio_secret: process.env.ULTIMA_BUCKET_ACCESS_KEY_SECRET || 'secret123',
    bucket_public: process.env.PUBLIC_BUCKET_NAME || 'public',
    bucket_usermedia: process.env.MEDIA_BUCKET_NAME || 'usermedia'
};
