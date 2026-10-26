import { Logger, ValidationPipe } from '@nestjs/common';
import { type CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import express from 'express';
import { type Request } from 'express';
import bodyParserErrorHandler from 'express-body-parser-error-handler';
import { graphqlUploadExpress } from 'graphql-upload';
import { ConfigService } from 'nestjs-config';
import newrelic from 'newrelic/index';
import { getTrustedProxies } from 'src/proxies';

import { LwpBuildType } from './api/dtos/LwpBuildType';
import { AppModule } from './app.module';

const corsOptionsDelegate: CorsOptionsDelegate<Request> = (req, callback) => {
    if (req.path === '/graphql') {
        const origin = [process.env.HOSTED_URL, process.env?.ANALYTICS_URL].filter(Boolean) as string[];

        callback(null, {
            origin,
            credentials: true
        });
    } else {
        callback(null, {});
    }
};

async function bootstrap(): Promise<void> {
    Logger.verbose(`Beginning bootstrapping...`);

    const server = express();

    const trustedProxies = await getTrustedProxies();

    server.set('trust proxy', trustedProxies.length ? trustedProxies : false);

    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    Logger.verbose(`App module created`);

    app.use((req, res, next) => {
        res.setHeader('Strict-Transport-Security', `max-age=${2 * 365 * 24 * 60 * 60 /* 2 years */}; includeSubDomains; preload`);
        next();
    });

    Logger.verbose(`Strict transport security enabled`);

    app.enableCors(
        [LwpBuildType.DEV, LwpBuildType.STAGE, LwpBuildType.PRODUCTION].includes(process.env.LWP_ENV as LwpBuildType)
            ? corsOptionsDelegate
            : {}
    );

    Logger.verbose(`CORS enabled`);

    app.use(graphqlUploadExpress({ maxFileSize: 50000000, maxFieldSize: 50000000, maxFiles: 50 }));
    Logger.verbose(`graphqlUpload enabled`);
    app.use(bodyParser.json({ limit: '50MB' }));
    Logger.verbose(`bodyParser enabled`);
    app.use(
        bodyParserErrorHandler({
            onError: (err) => {
                newrelic.noticeError(
                    err,
                    {
                        bodyParserError: true
                    },
                    false
                );
            }
        })
    );
    Logger.verbose(`Handling bodyParser errors`);

    newrelic.setErrorGroupCallback((metadata) => {
        if (metadata.customAttributes['excludeFromErrorGroup']) {
            return metadata.error?.message?.replace(
                metadata.customAttributes['excludeFromErrorGroup'] as string,
                (metadata.customAttributes['replaceInErrorGroup'] as string) || '<excl.>'
            );
        }
    });

    const configService: ConfigService = app.get(ConfigService);

    Logger.verbose(`Got the config service`);

    const port = configService.get('server.port');

    Logger.verbose(`Got server port`);

    app.useGlobalPipes(
        new ValidationPipe({
            validationError: { target: false },
            forbidUnknownValues: false
        })
    );
    Logger.verbose(`Enabled validation pipe`);
    await app.listen(port);
    Logger.verbose(`App running on port: ${port}`);
}

void bootstrap();
