import { InjectionToken, ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { StaticLwpParameter } from 'src/api/entities/parameter';
import { DefaultParameters } from 'src/api/model';

import { StubRepository } from './StubRepository';
import { StubRepositoryContainer } from './StubRepositoryContainer';

const moduleMocker = new ModuleMocker(global);

export const PARAMETER_OVERRIDES = {};

/**
 * Mocks TypeORM's ActiveRecord-style on-class repo access.
 *
 * @export
 * @param {StubRepositoryContainer} mockedRepos the repo container to use
 * @param {...EntityClassOrSchema[]} types the types to mock
 */
export function mockActiveRecord(mockedRepos: StubRepositoryContainer, ...types: EntityClassOrSchema[]): void {
    types.forEach((type) => {
        const repo = mockedRepos.repos()[type['name']];

        Object.getOwnPropertyNames(StubRepository.prototype)
            .filter((n) => n !== 'constructor')
            .forEach((prop) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                type[prop] = (...args: any): any => repo[prop](...args);
            });
    });
}

/**
 * Mocks Nest-style repo access.
 *
 * @export
 * @param {ModuleMetadata} metadata the metadata for the modules to mock
 * @param {EntityClassOrSchema[]} mockedModels the models to mock
 * @param {StubRepositoryContainer} mockedRepos the repos to mock
 * @param {(repo: StubRepository<never>, entityName: string) => unknown} [decorateRepo] optionally wraps
 *  each stub repository before it is injected, e.g. to record how the injected repositories are used
 * @return {Promise<TestingModule>} the Nest testing module
 */
export async function mockNest(
    metadata: ModuleMetadata,
    mockedModels: EntityClassOrSchema[],
    mockedRepos: StubRepositoryContainer,
    decorateRepo: (repo: StubRepository<never>, entityName: string) => unknown = (repo) => repo
): Promise<TestingModule> {
    const tokens: Record<string, EntityClassOrSchema> = Object.fromEntries(mockedModels.map((m) => [getRepositoryToken(m).toString(), m]));

    return Test.createTestingModule(metadata)
        .useMocker((token: InjectionToken) => {
            const normalisedToken = token.toString().replace('Admin_', '');

            if (tokens[normalisedToken]) {
                const entityName = tokens[normalisedToken]['name'];

                return decorateRepo(mockedRepos.repos()[entityName], entityName);
            }

            if (token === 'ParameterService') {
                return {
                    getParameterByKey: async (key: string): Promise<StaticLwpParameter> => {
                        const param = new StaticLwpParameter();

                        if (Object.keys(PARAMETER_OVERRIDES).includes(key)) {
                            param.value = PARAMETER_OVERRIDES[key];
                        } else {
                            param.value = DefaultParameters[key];
                        }

                        return Promise.resolve(param);
                    }
                };
            }

            if (typeof token === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
                const Mock = moduleMocker.generateFromMetadata(mockMetadata);

                return new Mock();
            }
        })
        .compile();
}
