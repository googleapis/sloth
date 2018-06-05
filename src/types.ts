
export interface IssueResult {
  issues: Issue[];
  repo: Repo;
}

export interface Member {
  login: string;
  id: number;
}

export interface Issue {
  language: string;
  repo: string;
  owner: string;
  url:
      string;  // 'https://api.github.com/repos/googleapis/nodejs-spanner/issues/22',
  repository_url:
      string;  // 'https://api.github.com/repos/googleapis/nodejs-spanner',
  labels_url:
      string;  // 'https://api.github.com/repos/googleapis/nodejs-spanner/issues/22/labels{/name}',
  comments_url:
      string;  // 'https://api.github.com/repos/googleapis/nodejs-spanner/issues/22/comments',
  events_url:
      string;  // 'https://api.github.com/repos/googleapis/nodejs-spanner/issues/22/events',
  html_url:
      string;       // 'https://github.com/googleapis/nodejs-spanner/issues/22',
  id: number;       // 269235010,
  number: number;   // 22,
  title: string;    // 'Cloud Spanner documentation should talk about supported
                    // types',
  user: {};         // [Object],
  labels: Label[];  // [Array],
  state: string;    // 'open',
  locked: boolean;  // false,
  assignee: string|null;       // null,
  assignees: string[];         // [],
  milestone: string|null;      // null,
  comments: number;            // 2,
  created_at: string;          // '2017-10-27T21:04:49Z',
  updated_at: string;          // '2018-02-20T21:03:44Z',
  closed_at: string;           // null,
  author_association: string;  // 'MEMBER',
  body: string;   // '_From @vkedia on October 4, 2017 22:33_\n\nOn the cloud
                  // spanner documentation, I could not find any mention of what
                  // data types are supported and how are these to be specified
                  // in the client library. For eg how would I specify a date or
                  // a timestamp or a float or bytes. I have seen customers
                  // specifying bytes as Base64 encoded since the rpc protocol
                  // talks about that. But the client library does Base64
                  // encoding on their behalf.\n\n_Copied from original issue:
                  // GoogleCloudPlatform/google-cloud-node#2654_',
  reactions: {};  // [Object]
  pull_request: {};
}

export interface Label {
  id: number;
  name: string;
  color: string;
  url: string;
  description: string;
  default: boolean;
}


export interface RepoResult extends Result {
  repo: string;
}

export interface LanguageResult extends Result {
  language: string;
}

export interface Result {
  total: number;
  p0: number;
  p1: number;
  p2: number;
  pX: number;
  outOfSLO: number;
}

export interface Repo {
  repo: string;
  language: string;
}

export interface Users {
  orgs: string[];
  membership: Membership[];
}


export interface Membership {
  team: string;
  users: string[];
  repos: string[];
}

export interface Team {
  name: string;         //'Contributors',
  id: string;           // 286166,
  slug: string;         //'contributors',
  description: string;  //'',
  privacy: string;      //'closed',
  url: string;          //'https://api.github.com/teams/286166',
  members_url:
      string;  //'https://api.github.com/teams/286166/members{/member}',
  repositories_url: string;  //'https://api.github.com/teams/286166/repos',
  permission: string;        //'push',
  parent: string;            // null
  org?: string;
  organization?: Organization;
}

export interface Organization {
  login: string;       // "github",
  id: number;          // 1,
  url: string;         // "https://api.github.com/orgs/github",
  repos_url: string;   // "https://api.github.com/orgs/github/repos",
  events_url: string;  // "https://api.github.com/orgs/github/events",
  hooks_url: string;   // "https://api.github.com/orgs/github/hooks",
  issues_url: string;  // "https://api.github.com/orgs/github/issues",
  members_url:
      string;  // "https://api.github.com/orgs/github/members{/member}",
  public_members_url:
      string;  // "https://api.github.com/orgs/github/public_members{/member}",
  avatar_url: string;   // "https://github.com/images/error/octocat_happy.gif",
  description: string;  // "A great organization"
}
