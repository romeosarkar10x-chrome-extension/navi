# Git commits

- Commit changes with git as you develop features — don't leave work uncommitted.
- Keep commits **small and focused**: one logical change per commit.
- Group only related changes together. Never bundle many unrelated changes into one large commit.
- Write clear commit messages describing the single change.
- Author Claude's own commits as Claude, not the user. **Override the identity per-commit — never change the repo's git config**, since that would also reauthor the user's commits.
  - Use the `-c` flags on each commit so both author and committer are set for that one command only:
    ```
    git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "..."
    ```
  - Do NOT run `git config user.name`/`user.email` (local or global) to set this.
