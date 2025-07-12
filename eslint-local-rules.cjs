module.exports = {
    'no-standalone-comments': {
        create(context) {
            const sourceCode = context.getSourceCode();
            
            return {
                Program() {
                    const comments = sourceCode.getAllComments();
                    
                    comments.forEach(comment => {
                        // Skip JSDoc comments
                        if (comment.type === 'Block' && comment.value.startsWith('*')) {
                            return;
                        }
                        
                        // Skip eslint-disable comments
                        if (comment.value.includes('eslint-disable')) {
                            return;
                        }
                        
                        // Skip TODO/FIXME/HACK comments
                        if (comment.value.match(/^\s*(TODO|FIXME|HACK)/)) {
                            return;
                        }
                        
                        
                        // Skip triple slash directives
                        if (comment.type === 'Line' && sourceCode.text.slice(comment.range[0] - 1, comment.range[0] + 2) === '///') {
                            return;
                        }
                        
                        // Check if it's a line comment on its own line
                        if (comment.type === 'Line') {
                            const tokenBefore = sourceCode.getTokenBefore(comment, { includeComments: false });
                            const tokenAfter = sourceCode.getTokenAfter(comment, { includeComments: false });
                            
                            // If there's no token on the same line before the comment, it's a standalone comment
                            if (!tokenBefore || tokenBefore.loc.end.line < comment.loc.start.line) {
                                context.report({
                                    node: comment,
                                    loc: comment.loc,
                                    message: 'Standalone line comments are not allowed. Use self-documenting code instead.'
                                });
                            }
                        }
                    });
                }
            };
        }
    }
};