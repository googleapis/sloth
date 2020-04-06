#!/usr/bin/env node

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

import * as meow from 'meow';
import {showSLOs, showApiSLOs, showLanguageSLOs} from './slo';
import {showIssues, tagIssues} from './issue';
import {reconcileUsers, reconcileTeams, reconcileRepos} from './users';
import {syncRepoSettings} from './repos';
import * as updateNotifier from 'update-notifier';
import {Flags} from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

updateNotifier({pkg}).notify();

const cli = meow(
  `
	Usage
	  $ sloth

	Options
    --csv         Encode the data in CSV format
    --api         Filter results by a specific API
    --untriaged   Filter by untriaged issues
    --outOfSLO    Filter by issues that are out of SLO
    --language    Filter by a given language
    --repo        Filter by a given repository
    --pr          Filter to show only PRs
    --type        Filter to show only issues of a given type
    --pri         Filter to show only issues with a given priorty

	Examples
    $ sloth [--csv][--api]
    $ sloth issues [--csv][--untriaged][--outOfSLO][--language][--repo][--api][--pr][--type]
    $ sloth apis
    $ sloth tag-issues
    $ sloth users
    $ sloth repos
    $ sloth sync-repo-settings

`,
  {
    flags: {
      untriaged: {type: 'boolean'},
      language: {type: 'string', alias: 'l'},
      repo: {type: 'string', alias: 'r'},
      outOfSLO: {type: 'boolean'},
      csv: {type: 'boolean'},
      api: {type: 'string'},
      pr: {type: 'boolean'},
      type: {type: 'string'},
      pri: {type: 'string'},
    },
  }
);

const cmd = cli.input.length > 0 ? cli.input[0] : null;
let p: Promise<void | {}>;

switch (cmd) {
  case 'sync-repo-settings':
    p = syncRepoSettings((cli.flags as unknown) as Flags);
    break;
  case 'tag-issues':
    p = tagIssues();
    break;
  case 'users':
    p = reconcileUsers();
    break;
  case 'issues':
    p = showIssues((cli.flags as unknown) as Flags);
    break;
  case 'repos':
    p = reconcileRepos();
    break;
  case 'teams':
    p = reconcileTeams();
    break;
  case 'apis':
    p = showApiSLOs(cli);
    break;
  case 'languages':
    p = showLanguageSLOs(cli);
    break;
  case null:
    p = showSLOs(cli);
    break;
  default:
    cli.showHelp();
}

p!.catch(console.error);
