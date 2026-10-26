// Makes a rule that makes every Next.js page assign `property` on its default export (e.g. MyPage.pageType = PageType.ADMIN).
// `isValidValue` is optional: when given, an assignment whose value fails it is reported as `invalid` instead of counting.
const requirePageProperty = ({ property, description, missingMessage, invalidMessage, isValidValue = () => true }) => ({
    meta: {
        type: 'problem',
        docs: { description, recommended: true },
        schema: [],
        messages: { missing: missingMessage, invalid: invalidMessage ?? missingMessage }
    },
    create(context) {
        const filename = context.getFilename();

        // Skip non-page files
        if (!filename || !/(?:[/\\]pages[/\\])/.test(filename)) {
            return {};
        }

        let defaultExportName = null;
        let hasAssignment = false;

        return {
            ExportDefaultDeclaration(node) {
                const decl = node.declaration;

                // Identify default export (Named or Anonymous)
                if (decl.type === 'Identifier') {
                    defaultExportName = decl.name;
                }

                // No need to process further if export is anonymous
                if (!defaultExportName) return;
            },

            AssignmentExpression(node) {
                const left = node.left;

                if (left && left.type === 'MemberExpression' && left.property.name === property) {
                    const obj = left.object;

                    if (!defaultExportName || obj.name === defaultExportName) {
                        // An invalid value is reported once, here, so it must not be reported again as missing
                        hasAssignment = true;
                        if (!isValidValue(node.right)) context.report({ node, messageId: 'invalid' });
                    }
                }
            },

            'Program:exit'() {
                if (defaultExportName && !hasAssignment) {
                    context.report({ node: context.getSourceCode().ast, messageId: 'missing' });
                }
            }
        };
    }
});

// The scanner (frontend/generate-announcement-pages.js) reads the title as plain text from the page file, so it must be a quoted string.
// It reads up to the next matching quote and knows nothing of escapes, so a backslash (as in 'Child\'s') is refused: use "Child's".
const isPlainTitle = (value) =>
    value.type === 'Literal' && typeof value.value === 'string' && value.value.trim() !== '' && !value.raw.includes('\\');

export default {
    rules: {
        'require-page-type': requirePageProperty({
            property: 'pageType',
            description: 'Ensure every Next.js page defines a pageType on its default export (e.g., MyPage.pageType = PageType.ADMIN).',
            missingMessage:
                'This page is missing a pageType assignment. Add `<ComponentName>.pageType = PageType.ADMIN;` near the default export.'
        }),

        'require-page-title': requirePageProperty({
            property: 'pageTitle',
            description: "Ensure every Next.js page defines a pageTitle on its default export (e.g., MyPage.pageTitle = 'Admin: Schools').",
            missingMessage:
                "This page is missing a pageTitle assignment. Add `<ComponentName>.pageTitle = 'Area: Page name';` under the pageType line.",
            invalidMessage:
                "pageTitle must be a plain quoted text with no backslash, for example `<ComponentName>.pageTitle = 'Area: Page name';`. For an apostrophe use double quotes: \"Child's reading\".",
            isValidValue: isPlainTitle
        })
    }
};
