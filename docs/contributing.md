# Step-by-step development and direct pushes

This lab is developed in small, explainable steps. Changes are committed and
pushed directly to the selected branch; pull requests are not part of this
project workflow.

## Workflow

1. Agree on the goal, behavior, and scope for the next step.
2. Explain the design choices and alternatives before implementing them.
3. Make a focused change, update related requirements or decision records, and
   run the relevant tests.
4. Review the diff and test results together. Keep separate commits for
   meaningful learning steps.
5. Once the user approves the step, commit it with a descriptive message and
   push the working branch to `origin`:

   ```powershell
   git add <files-for-this-step>
   git commit -m "<descriptive message>"
   git push -u origin <working-branch>
   ```

6. Do not switch to or push to the default branch unless that integration step
   is explicitly agreed.

## URL shortener release sequence

- **v1 MVP:** finish and verify the URL-shortener API, SQLite persistence,
  health check, request logs, and single-version Compose deployment. Keep
  Nginx routing to v1 while v2 is not implemented.
- **v2 rollout exercise:** after v1 is complete, agree on a specific v2 change.
  Add v2 as a separate step, verify backward compatibility, and practice
  canary weights, monitoring, intentional failure, and rollback.

Do not create a v2 change solely to make the version number different. A
canary should represent an intentional, testable product change.

## Step checklist

- The change matches the agreed scope.
- Related requirements and decision records are updated where appropriate.
- Relevant tests, builds, and checks have passed; results are recorded.
- The diff contains no unrelated edits or local environment files.
- The user has reviewed and approved the step before it is committed or pushed.
