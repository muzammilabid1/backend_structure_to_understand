import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts key=value pairs from a named TOML section (e.g. "[env.staging.vars]").
 * Stops at the next section header or end of file.
 */
function extractTomlSection(content: string, sectionHeader: string): Record<string, string> {
    const lines = content.split('\n');
    const result: Record<string, string> = {};

    let inSection = false;
    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (line === sectionHeader) {
            inSection = true;
            continue;
        }

        // Stop when entering a new section
        if (inSection && line.startsWith('[')) {
            break;
        }

        if (inSection && line && !line.startsWith('#')) {
            const eqIdx = line.indexOf('=');
            if (eqIdx !== -1) {
                const key = line.slice(0, eqIdx).trim();
                const value = line.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
                result[key] = value;
            }
        }
    }

    return result;
}

describe('wrangler.toml staging configuration', () => {
    const tomlPath = path.resolve(__dirname, '..', 'wrangler.toml');
    let tomlContent: string;
    let stagingVars: Record<string, string>;

    beforeAll(() => {
        tomlContent = fs.readFileSync(tomlPath, 'utf-8');
        stagingVars = extractTomlSection(tomlContent, '[env.staging.vars]');
    });

    it('wrangler.toml exists', () => {
        expect(fs.existsSync(tomlPath)).toBe(true);
    });

    it('staging environment defines a [env.staging.vars] section', () => {
        expect(tomlContent).toContain('[env.staging.vars]');
    });

    it('READ_ONLY_MODE is explicitly set in [env.staging.vars]', () => {
        expect(stagingVars).toHaveProperty('READ_ONLY_MODE');
    });

    it('READ_ONLY_MODE is set to "true" in [env.staging.vars]', () => {
        expect(stagingVars['READ_ONLY_MODE']).toBe('true');
    });
});
