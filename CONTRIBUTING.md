# Contributing to Salt

Thank you for your interest in contributing to this project! We are excited to collaborate with our friends to improve and grow this repository. Please follow the guidelines below to ensure that your contributions are aligned with the project's standards.

## Branch Naming and Reserved Branches
We have the following branch guidelines to maintain structure and consistency:

* `dev`: This is the main development branch. It has branch protections enabled, meaning no force-pushes or deletions are allowed. Changes to this branch can be made without a pull request (PR), but we still recommend using PRs for transparency and review.
* `media`: This branch is reserved as a data lake for images. It is not used for feature development and is meant to store media files. Do not push code changes to this branch.

Feature Branches: When creating feature branches, use lowercase names based on the main component of the application you are working on. For example:
* `docs` for documentation updates
* `ansible` for hardware infrastructure changes
* `prometheus` for monitoring configurations 

The name should correspond to the component specified in the conventional commit message.

## Conventional Commits
We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification to keep commit history clean and consistent. Each commit message should start with a type and scope, followed by a concise description of the changes. This helps automate release management, changelogs, and understanding the history of the project.

### Commit Format:
```
<type>(<scope>): <description>
```

### Examples:
* `feat(auth): add login functionality`
* `fix(docs): correct typo in README`


The available types are:
- feat: A new feature
- fix: A bug fix
- style: Code style changes (e.g., formatting)
- refactor: Code changes that neither fix a bug nor add a feature
- perf: Performance improvements
- ci: Continuous integration configuration changes

### PR Titles:
PR titles should also follow the Conventional Commit format, starting with the appropriate type and component. Example:

```
feat(prometheus): add alerting configuration for high load
```

## Pull Requests (PRs)
We enforce PR requirements for certain branches:

* The `qa` and `main` branches require pull requests before merging. Both branches have branch protection enabled, ensuring that all changes are reviewed before being merged.
* CODEOWNER Approval: Before merging into `qa` or `main`, your PR must receive at least one approval from a designated CODEOWNER.
* The PR title should follow the conventional commit format mentioned above.

## How to Contribute
1. Clone the repository and create your feature branch.
2. Make your changes. Please follow the guidelines outlined above for commit messages and PR title format.
3. Push your changes from your cloned repository.
4. Create a pull request to the appropriate branch (qa, dev, or main). Ensure that you follow the PR requirements and request the necessary CODEOWNER approvals.
5. Participate in the review process and address any feedback provided by reviewers.
