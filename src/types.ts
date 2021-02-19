// Copyright 2018 Google LLC
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

import * as Repos from './repos.json';

export type Repo = typeof Repos.repos[number];

export interface Team {
  name: string;
  apis: string[];
  repos: string[];
}

export interface IssueResult {
  issues: Issue[];
  repo: Repo;
}

export interface Member {
  login: string;
  id: number;
}

export interface Issue {
  assignees: string[];
  team: string;
  isPR: boolean;
  api?: string;
  types: string[];
  pri?: number;
  language: string;
  repo: string;
  owner: string;
  name: string;
  number: number;
  createdAt: string;
  title: string;
  url: string;
  labels: string[];
  isTriaged: boolean;
  isOutOfSLO: boolean;
}

export interface Label {
  id: number;
  name: string;
  color: string;
  url: string;
  description: string;
  default: boolean;
}

export interface ApiResult extends Result {
  api: string;
}

export interface RepoResult extends Result {
  repo: string;
  language: string;
}

export interface LanguageResult extends Result {
  language: string;
}

export interface TeamResult extends Result {
  team: string;
}

export interface Result {
  total: number;
  p0: number;
  p1: number;
  p2: number;
  pX: number;
  outOfSLO: number;
}

export interface Membership {
  team: string;
  users: string[];
  repos: string[];
}

export interface GitHubTeam {
  name: string; //'Contributors'
  id: number; // 286166
  slug: string; //'contributors'
  description: string; //''
  privacy: string; //'closed'
  url: string; //'https://api.github.com/teams/286166'
  members_url: string; //'https://api.github.com/teams/286166/members{/member}'
  repositories_url: string; //'https://api.github.com/teams/286166/repos'
  permission: string; //'push'
  parent: string; // null
  org?: string;
  organization?: Organization;
}

export interface Organization {
  login: string; // "github"
  id: number; // 1
  url: string; // "https://api.github.com/orgs/github"
  repos_url: string; // "https://api.github.com/orgs/github/repos"
  events_url: string; // "https://api.github.com/orgs/github/events"
  hooks_url: string; // "https://api.github.com/orgs/github/hooks"
  issues_url: string; // "https://api.github.com/orgs/github/issues"
  members_url: string; // "https://api.github.com/orgs/github/members{/member}"
  public_members_url: string; // "https://api.github.com/orgs/github/public_members{/member}"
  avatar_url: string; // "https://github.com/images/error/octocat_happy.gif"
  description: string; // "A great organization"
}

export interface Flags {
  csv: boolean;
  language: string;
  outOfSlo: boolean;
  untriaged: boolean;
  team: string;
  repo: string;
  api: string;
  pr: boolean;
  type: string;
  pri: string;
  url: string;
}

export interface GetBranchResult {
  name: string;
  protected: boolean;
  protection?: GetBranchProtectionResult;
}

export interface IssuesApiResponse {
  issues: ApiIssue[];
  nextPageToken: string;
}

export interface ApiIssue {
  labels: string[];
  isPr: boolean;
  repo: string; // googleapis/nodejs-rcloadenv
  createdAt: string;
  updatedAt: string;
  issueId: number;
  title: string;
  priority: string;
  assignees: Array<{
    id: number;
    login: string;
  }>;
  url: string;
  priorityUnknown: boolean;
}

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

export interface GitHubRepo {
  name: string;
  owner: {
    login: string;
  };
  language: string;
  archived: boolean;
  topics: string[];
  html_url: string;
  full_name: string;
  default_branch: string;
  allow_merge_commit: boolean;
  license: {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
    node_id: string;
  };
  code_of_conduct: {
    key: string;
    name: string;
    html_url: string;
    url: string;
  };
}

export interface GetBranchProtectionResult {
  url: string;
  enabled: boolean;
  required_status_checks: {
    url: string;
    contexts: string[];
    contexts_url: string;
    enforcement_level: string;
  };
  enforce_admins: {
    url: string;
    enabled: boolean;
  };
  required_pull_request_reviews: {
    url: string;
    dismissal_restrictions: {
      url: string;
      users_url: string;
      teams_url: string;
      users: GitHubUser[];
      teams: GitHubTeam[];
    };
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
    required_approving_review_count: number;
  };
  restrictions: {
    url: string;
    users_url: string;
    teams_url: string;
    apps_url: string;
    users: GitHubUser[];
    teams: GitHubTeam[];
    apps: [
      {
        id: number;
        slug: string;
        node_id: string;
        owner: {
          login: string;
          id: number;
          node_id: string;
          url: string;
          repos_url: string;
          events_url: string;
          hooks_url: string;
          issues_url: string;
          members_url: string;
          public_members_url: string;
          avatar_url: string;
          description: string;
        };
        name: string;
        description: string;
        external_url: string;
        html_url: string;
        created_at: string;
        updated_at: string;
        permissions: {
          metadata: string;
          contents: string;
          issues: string;
          single_file: string;
        };
        events: string[];
      }
    ];
  };
  required_linear_history: {
    enabled: boolean;
  };
  allow_force_pushes: {
    enabled: boolean;
  };
  allow_deletions: {
    enabled: boolean;
  };
}

export interface GitHubRepoFile {
  type: string;
  encoding: string;
  size: number;
  name: string;
  path: string;
  content: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  download_url: string;
  _links: {
    git: string;
    self: string;
    html: string;
  };
}
