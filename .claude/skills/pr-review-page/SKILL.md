---
name: pr-review-page
description: Publish a review page for a Regibee pull request once its checks finish. The page says what changed, why it is safe to merge, and shows before and after pictures of the snapshots the PR changed in Chromatic. Use after opening a PR when its checks complete, or when the user asks for a review, a summary of what a PR changed visually, or whether a PR is good to merge.
---

# PR review page

One page per pull request that lets the user decide to merge in a minute: a
verdict, the evidence for it, and pictures of every snapshot the PR changed.
[example.html](example.html) is the page made for PR 55. Match its sections,
wording style and CSS; copy its `<style>` block as is. Leave out its "Sample
review" line, which was only true for that already-merged PR.

The page is advice. Accept Chromatic changes and merge only when the user clicks
the Accept and merge button, or asks for it in words (step 7). Never deny changes
or comment on the PR from this skill.

## 1. Wait for the checks

`gh pr checks <n> --repo dango-design/regibee`. Wait until `chromatic` (GitHub
Actions) and `Vercel` have finished. If you opened the PR, the app wakes you
when CI finishes; don't poll. `UI Tests` and `UI Review` stay pending until
someone reviews in Chromatic, so don't wait for those.

## 2. Find the two builds

- **Head build**: `chromatic_get_latest_build` with `branches: [<head branch>]`.
  Its `commit` must equal the PR's head SHA (`gh pr view <n> --json headRefOid`).
  If it doesn't, the build is still running or stale: say so and stop.
- **Base build**: the `main` build for the commit the PR branched from.
  `git fetch origin && git merge-base origin/main <head sha>`, then find the
  Chromatic run for that commit and read its build number from the log:

  ```bash
  gh run list --repo dango-design/regibee --workflow chromatic.yml --commit <base sha> --json databaseId --jq '.[0].databaseId'
  gh run view <run id> --repo dango-design/regibee --log | grep -m1 -oE "Build [0-9]+ initialized"
  ```

  If that commit has no run, step back along `git log --first-parent origin/main`
  until one does. Look the build up with `project.build(number:)`.

Compare against the base build, not against Chromatic's accepted baselines. The
base build is exactly what `main` looked like when the branch started, even if
some of `main`'s changes were never accepted.

## 3. Find what the PR changed

Query both builds for every story's snapshot URL with `captureImage(signed:
false)`. Those URLs are short and end in a hash of the pixels.

```graphql
query Captures($buildId: ID!) {
  build(id: $buildId) {
    ... on CompletedBuild {
      tests(first: 200) {
        nodes {
          id
          story { storyId }
          visualComparisons { headCapture { captureImage(signed: false) { imageUrl } } }
        }
      }
    }
  }
}
```

Write each as `storyId<TAB>url` lines to a TSV in your scratchpad, then:

```bash
python3 -E .claude/skills/pr-review-page/review_images.py compare head.tsv base.tsv
```

Run python from a directory you control, not the download folder. `changed`
lists stories whose pixels differ, `new` lists stories the PR added, and
`identical` counts the rest. Keep the head build's test `id` for every changed
and new story. Step 7 accepts those tests. Also read the head build's `pendingCount`, so the
page can say how many of Chromatic's pending changes are this PR's and how many
were already waiting on `main`.

## 4. Look at every change

For each changed story:

```bash
python3 -E .claude/skills/pr-review-page/review_images.py render <short-name> <base url> <head url> <scratchpad>/pr<n>/img
```

It prints the changed bands. For a tall page capture, run it again with
`--box x0,y0,x1,y1` around the most telling band, ideally with an unchanged
neighbor in frame for contrast. Open the images and look at them. Then judge each
change against the diff (`git diff <base sha> <head sha>`) and the PR
description:

- **Expected**: the component's code changed and the picture shows that change.
- **Check**: the change is bigger than the code explains, or text, layout or
  color moved where the code didn't ask for it. Explain what you see.
- Scattered single pixels at rounded corners are anti-aliasing. Say so, but don't
  flag them.

When many stories share one cause, such as a shared component or a token, show
one example and give the count. Show new stories with their head image only.

## 5. Accessibility

Call `chromatic_list_accessibility_changes` on both builds. A rule with
`regressionCount` above 0 on the base build but not on the head build was fixed
by the PR. One with `regressionCount` above 0 on the head build is new, and goes
in the verdict as a **Check**. Leave out changes that already show on the base
build; the PR didn't cause them.

## 6. Write and publish the page

Sections, in this order:

1. Header: PR number and title, branch, head SHA, files and lines changed, a
   verdict stamp (**Good to merge** or **Check first**) with one bold sentence and
   one plain one, then links to the PR, the Chromatic build and its Storybook.
2. **What changed**: 2 to 4 bullets in user-facing words.
3. **Why it's good**: up to three facts (snapshots changed out of total, accessibility
   issues before and after, anything else true and checkable), then bullets.
4. **Visual changes**: one block per change, with a verdict chip, what moved and why,
   a link to the test in Chromatic, and Before and After images with a Show changes
   toggle.
5. **Accessibility**: a rule table, if anything changed.
6. **Checks on this PR**: each check with its status, what reports it, and what it
   means.
7. **Accept and merge**: what the Accept and merge button in the chat does.
   It accepts this PR's changes on the head build, which records the review and
   turns UI Tests green. Then it merges the PR at the reviewed commit. Also give
   the same request as a sentence to copy, such as "Accept the 4 changes from
   PR 55 on Chromatic build 88 and merge PR 55". If the head build's
   `pendingCount` is higher than this PR's changes, list the extra ones as
   already waiting on `main`, and say the button leaves them alone, as the
   example does.
8. **Worth knowing**: loose ends from the PR description or the diff, plus
   anything the review couldn't check.
9. Footer: which builds and commits were compared, and how.

Embed the images as files published next to the page (the Artifact `files`
map). Never put a Chromatic image URL in the page, signed or not. Links to the
build and its tests are fine. Title the page `PR <n> Review`. Publish it as an
Artifact, then give the user the link, the verdict and any **Check** items in
two or three lines.

End the turn with `wrap_up`. Its question names the tests and the build, such as
"Accept the 4 changes from PR 55 on build 88 and merge?". Give it one reply
button, labeled `Accept and merge`. Label it `Merge` when the PR changed no
snapshots, and `Accept and merge anyway` on a **Check first** verdict. The page
can't send a message to the chat, so this button is how the user acts on the
review.

## 7. Accept and merge

When the user clicks the button, or asks for the same thing in words:

1. Check the PR is still open at the reviewed commit:
   `gh pr view <n> --repo dango-design/regibee --json state,headRefOid`. If it
   moved, change nothing, say so, and offer a new review.
2. Check the head build is still the branch's latest:
   `chromatic_get_latest_build` must return the same build number and commit,
   with `isSuperseded` false.
3. Accept the PR's changed and new tests with `chromatic_mutate`. When the head
   build's `pendingCount` equals the PR's changes, accept them all in one call:
   any one of those test ids, with `batch: BUILD` added to the input. Otherwise
   send one test id per call, with no `batch`, so the changes already waiting on
   `main` stay pending.

   ```graphql
   mutation ReviewTest($testId: ID!, $status: ReviewTestInputStatus!) {
     reviewTest(input: { testId: $testId, status: $status }) {
       updatedTests { id status }
       userErrors { __typename ... on UserError { message } }
     }
   }
   ```

   Pass `status: "ACCEPTED"`. Check that each test comes back in
   `updatedTests` as `ACCEPTED`. On any `userErrors`, stop and report them.
   Don't merge.
4. Merge, refusing if the branch moved:
   `gh pr merge <n> --repo dango-design/regibee --merge --match-head-commit <head sha>`.
5. Tell the user how many changes were accepted on which build, and that the PR
   merged. `main` then deploys to regibee.com.
