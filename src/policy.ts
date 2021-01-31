// Copyright 2020 Google LLC
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

import {request} from 'gaxios';
import {gethub} from './util';
import {GitHubRepo, GetBranchProtectionResult} from './types';
import {google} from 'googleapis';
import {authenticate} from '@google-cloud/local-auth';

const spreadsheetId = '1SD--DdtB9a-UF2PrpYR6CQ6jIWyull_HKZeBtkQ6DTo';

const rawBase = 'https://raw.githubusercontent.com/';

export async function getRepo(repo: string) {
  const url = `/repos/${repo}`;
  const res = await gethub<GitHubRepo>({
    url,
  });
  return res.data;
}

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

// Dependencies are up to date.
// Branch Protection enabled
// At least one required check
// Required Code Reviews
// CODEOWNERs files are present
// Merge commits disabled
// Has License
// Has CoC
// Has Lic headers
// CODEOWNERs approvals are required
// There is a CONTRIBUTING.md

async function hasRenovate(repo: GitHubRepo) {
  return checkFileExists(repo, 'renovate.json', false);
}

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

async function hasCodeOwners(repo: GitHubRepo) {
  return checkFileExists(repo, 'CODEOWNERS', true);
}

async function hasMergeCommitsDisabled(repo: GitHubRepo) {
  return !repo.allow_merge_commit;
}

async function hasLicense(repo: GitHubRepo) {
  return ['apache-2.0', 'mit'].includes(repo.license?.key);
}

async function hasCodeOfConduct(repo: GitHubRepo) {
  return checkFileExists(repo, 'CODE_OF_CONDUCT.md', true);
}

async function hasContributing(repo: GitHubRepo) {
  return checkFileExists(repo, 'CONTRIBUTING.md', true);
}

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
