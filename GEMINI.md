# Gemini Code Review Workflow

This document outlines the process for reviewing Pull Requests (PRs) using the Gemini CLI and `gh` command-line tool.

## Review Process

1.  **Understand the PR:**
    *   Use `gh pr view <PR_NUMBER>` to get a high-level overview of the PR, including the title, description, and related issues.

2.  **Analyze the Changes:**
    *   Use `gh pr diff <PR_NUMBER>` to get a detailed, line-by-line view of all the changes in the PR.

3.  **Provide Feedback:**
    *   Use `gh pr comment <PR_NUMBER> --body "..."` to add comments to the PR.
    *   **Unique IDs:** Prepend each comment with a unique, sequential ID to make it easy to track and reference specific feedback points. The format is `[<TYPE>-<CATEGORY>-<ID>]`, for example:
        *   `[R-ERR-01]` for a recommended fix for an error.
        *   `[R-MAGIC-01]` for a recommendation about magic numbers.
        *   `[Q-CONF-01]` for a question about configuration handling.
    *   **Code Blocks:** When suggesting code changes, use Markdown's code blocks to clearly format the code.
    *   **Quoting:** Be careful with quotes within the `--body` argument. Use single quotes for the main body if it contains double quotes, and vice-versa.

## Example

```bash
# 1. View the PR
gh pr view 90

# 2. Get the diff
gh pr diff 90

# 3. Add comments
gh pr comment 90 --body '[R-ERR-01] This is a comment about an error.'
gh pr comment 90 --body '[Q-CONF-01] This is a question about the configuration.'
```
