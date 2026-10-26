import { type ApolloServerPlugin } from '@apollo/server';
import { unwrapResolverError } from '@apollo/server/errors';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import createNewRelicPlugin from '@newrelic/apollo-server-plugin';
import type { GraphQLFormattedError } from 'graphql';

import { ApiModule } from '../api/api.module';
import { LwpBuildType } from '../api/dtos/LwpBuildType';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { BaseModule } from '../base.module';
import { HealthModule } from '../health/health.module';

const newRelicPlugin = createNewRelicPlugin<ApolloServerPlugin>({});

const apolloServerV3DefaultFormatErrorImpl = (formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
    const originalError = unwrapResolverError(error);
    const exception: Record<string, unknown> = {
        ...(typeof originalError === 'object' ? originalError : null)
    };

    delete exception.extensions;
    if (formattedError.extensions?.stacktrace) {
        exception.stacktrace = formattedError.extensions.stacktrace;
    }

    const extensions: Record<string, unknown> = {
        ...formattedError.extensions,
        exception
    };

    delete extensions.stacktrace;

    return {
        ...formattedError,
        extensions
    };
};

@Module({
    imports: [
        HttpModule,
        AuthModule,
        BaseModule,
        ApiModule,
        GraphQLModule.forRoot<ApolloDriverConfig>({
            autoSchemaFile: 'schema.gql',
            driver: ApolloDriver,
            context: ({ req }) => ({ ...req }),
            formatError: apolloServerV3DefaultFormatErrorImpl,
            buildSchemaOptions: { fieldMiddleware: [AuthorizationGuard.authorizeField] },
            playground: false,
            plugins: [
                newRelicPlugin,
                [LwpBuildType.LOCAL, LwpBuildType.DEV].includes(process.env.LWP_ENV as LwpBuildType)
                    ? ApolloServerPluginLandingPageLocalDefault()
                    : ApolloServerPluginLandingPageDisabled()
            ]
        }),
        HealthModule
    ],
    // providers: [...databaseProviders],
    exports: []
})
export class BootstrapModule {}
