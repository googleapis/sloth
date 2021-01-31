// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * This class provides scannng of repositories to ensure they follow the
 * guidance listed in go/cloud-dpe-oss-standards. It can be run locally as
 * a CLI:
 *
 *  $ sloth policy --repo googleapis/sloth
 *
 * Or it can be used as an export to a Google Sheet that's used to construct
 * a dashboard (go/yoshi-live in this case)
 */

import {request} from 'gaxios';
import {gethub} from './util';
import {GitHubRepo, GetBranchProtectionResult} from './types';
import {google} from 'googleapis';
import {authenticate} from '@google-cloud/local-auth';

const spreadsheetId = '1SD--DdtB9a-UF2PrpYR6CQ6jIWyull_HKZeBtkQ6DTo';
const rawBase = 'https://raw.githubusercontent.com/';

/**
 * Fetch the Repository metadata from the GitHub API
 * @param repo Name of the repository in org/name format
 */
export async function getRepo(repo: string) {
  const url = `/repos/${repo}`;
  const res = await gethub<GitHubRepo>({
    url,
  });
  return res.data;
}

/**
 * Call the GitHub API to obtain repository metadata for a set of repositories
 * that match the given filter.
 * @param search Search query in the GitHub API search syntax.
 *    See https://docs.github.com/en/github/searching-for-information-on-github/searching-for-repositories
 *    Example: `org:googleapis is:public archived:false`
 */
export async function getRepos(search: string) {
  const repos: Array<GitHubRepo> = [];
  for (let page = 1; ; page++) {
    const res = await gethub<{items: GitHubRepo[]}>({
      url: '/search/repositories',
      params: {
        page,
        per_page: 100,
        q: search,
      },
    });
    repos.push(...res.data.items);
    if (res.data.items.length < 100) {
      break;
    }
  }
  return repos;
}

/**
 * Given a relative path, search a given GitHub repository for the file.
 * @param repo Repostiory metadata from GitHub
 * @param file Relative path to the root of the GitHub repository to find
 * @param checkMagicFolder Also search the `.github` folder for a file
 */
async function checkFileExists(
  repo: GitHubRepo,
  file: string,
  checkMagicFolder = true
) {
  const urls = [`${rawBase}/${repo.full_name}/${repo.default_branch}/${file}`];
  if (checkMagicFolder) {
    urls.push(
      `${rawBase}/${repo.full_name}/${repo.default_branch}/.github/${file}`
    );
  }
  const results = await Promise.all(
    urls.map(url => {
      return request<void>({
        url,
        validateStatus: () => true,
      });
    })
  );
  const good = results.filter(x => x.status === 200);
  return good.length > 0;
}

/**
 * RenovateBot is enabled
 */
async function hasRenovate(repo: GitHubRepo) {
  return checkFileExists(repo, 'renovate.json', false);
}

/**
 * Branch protection with the following rules are enabled:
 * - require code reviews
 * - at least one reviewer required
 * - codeowners approval required
 * - at least one required status check
 */
async function hasBranchProtection(repo: GitHubRepo) {
  const url = `/repos/${repo.full_name}/branches/${repo.default_branch}/protection`;
  const res = await gethub<GetBranchProtectionResult>({
    url,
    validateStatus: () => true,
  });
  if (res.status !== 200) {
    // no branch protection at all 😱
    return false;
  }
  if (!res.data.required_pull_request_reviews) {
    // require code reviews
    return false;
  }
  if (
    res.data.required_pull_request_reviews.required_approving_review_count < 1
  ) {
    // require at least one code reviewer
    return false;
  }
  if (
    !res.data.required_status_checks ||
    res.data.required_status_checks.contexts.length === 0
  ) {
    // there is at least one required check
    return false;
  }
  if (!res.data.required_pull_request_reviews.require_code_owner_reviews) {
    // require code owners review
    return false;
  }
  return true;
}

/**
 * Ensure there is a `CODEOWNERS` file.  If this is not available,
 * but the flag is enabled in branch protection, GitHub ignores it.
 */
async function hasCodeOwners(repo: GitHubRepo) {
  return checkFileExists(repo, 'CODEOWNERS', true);
}

/**
 * Merge Commits are disabled
 */
async function hasMergeCommitsDisabled(repo: GitHubRepo) {
  return !repo.allow_merge_commit;
}

/**
 * Ensure there is a recognized LICENSE. GitHub verifies the license
 * is valid using https://github.com/licensee/licensee. This license
 * list is purposefully small. We can expand as needed.
 */
async function hasLicense(repo: GitHubRepo) {
  console.log(repo.license);
  const validLicenses = ['apache-2.0', 'mit', 'bsd-3-clause'];
  return validLicenses.includes(repo.license?.key);
}

/**
 * Ensure there is a Code of Conduct
 */
async function hasCodeOfConduct(repo: GitHubRepo) {
  return checkFileExists(repo, 'CODE_OF_CONDUCT.md', true);
}

/**
 * There is a CONTRIBUTING.md
 */
async function hasContributing(repo: GitHubRepo) {
  return checkFileExists(repo, 'CONTRIBUTING.md', true);
}

/**
 * Run all known checks in parallel, and return the results.
 *
 * Note: as of now, the GitHub API is not complaining about potential abuse
 * or rate limiting.  We should keep an eye out here to make sure it doesn't
 * start.
 */
export async function checkRepoPolicy(repo: GitHubRepo) {
  const [
    renovate,
    license,
    codeOfConduct,
    contributing,
    codeowners,
    branchProtection,
    mergeCommitsDisabled,
  ] = await Promise.all([
    hasRenovate(repo),
    hasLicense(repo),
    hasCodeOfConduct(repo),
    hasContributing(repo),
    hasCodeOwners(repo),
    hasBranchProtection(repo),
    hasMergeCommitsDisabled(repo),
  ]);
  const results = {
    repo: repo.full_name,
    language: repo.language,
    renovate,
    license,
    codeOfConduct,
    contributing,
    codeowners,
    branchProtection,
    mergeCommitsDisabled,
  };
  return results;
}

/**
 * While `cli.ts` has the main CLI logic, this method is used by `server.ts`
 * to expose a Cloud Run endpoint that can be attached to a Cloud Scheduler.
 * This will run a scan on repos we know about, and store the results in a
 * spreadsheet - exactly like the issue tracking.
 *
 * Note: I am using a different approach of identifying relevant repos.
 * This scans all repositories in the `googleapis` org, but only repos that
 * have a `samples` repository topic on them.  This is an experiment.
 */
export async function exportPolicyToSheets() {
  const googleapisRepos = await getRepos(
    'org:googleapis is:public archived:false NOT "google-cloud-php-" in:name'
  );
  const gcpRepos = await getRepos('org:GoogleCloudPlatform topic:samples');
  const repos = [...googleapisRepos, ...gcpRepos];
  //const repos = [await getRepo('googleapis/nodejs-storage')];
  const results = [];
  for (const repo of repos) {
    const result = await checkRepoPolicy(repo);
    console.log(result);
    results.push(result);
  }
  const values = results.map(i => {
    return [
      i.repo,
      i.language,
      i.branchProtection,
      i.codeOfConduct,
      i.codeowners,
      i.contributing,
      i.license,
      i.mergeCommitsDisabled,
      i.renovate,
    ];
  });
  values.unshift([
    'Repo',
    'Language',
    'Branch Protection',
    'Code of Conduct',
    'Codeowners',
    'Contributing',
    'License',
    'No Merge Commits',
    'Renovate',
  ]);

  // By setting SLOTH_LOCAL_AUTH to `true`, and passing a path to a keyfile
  // in GOOGLE_APPLICATION_CREDENTIALS, this allows us to locally test the
  // endpoint in `server.ts` without requiring 2 legged service account
  // credentials.  This should be only be used locally, as the Cloud Run
  // service account should already have the permissions it needs to modify
  // the magic spreadsheet.
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  const keyfilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS!;
  const auth = process.env.SLOTH_LOCAL_AUTH
    ? await authenticate({scopes, keyfilePath})
    : new google.auth.GoogleAuth({scopes});

  const sheets = google.sheets({
    version: 'v4',
    auth,
  });
  // clear the current text in the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'A1:Z10000',
  });

  // insert it into the sheet
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'A1',
          values,
        },
      ],
    },
  });
}
