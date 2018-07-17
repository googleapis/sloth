#!/usr/bin/env node
import * as meow from 'meow';
import {showSLOs} from './slo';
import {showIssues, tagIssues} from './issue';
import {reconcileLabels} from './label';
import {reconcileUsers, reconcileTeams, reconcileRepos} from './users';
import {syncRepoSettings} from './repos';
import * as updateNotifier from 'update-notifier';

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

	Examples
    $ sloth [--csv][--api]
    $ sloth issues [--csv][--untriaged][--outOfSLO][--language][--repo][--api][--pr]
    $ sloth tag-issues
    $ sloth users
    $ sloth repos
    $ sloth labels
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
        pr: {type: 'boolean'}
      }
    });

const cmd = cli.input.length > 0 ? cli.input[0] : null;
let p: Promise<void|{}>;

switch (cmd) {
  case 'labels':
    p = reconcileLabels();
    break;
  case 'sync-repo-settings':
    p = syncRepoSettings();
    break;
  case 'tag-issues':
    p = tagIssues();
    break;
  case 'users':
    p = reconcileUsers();
    break;
  case 'issues':
    p = showIssues(cli.flags);
    break;
  case 'repos':
    p = reconcileRepos();
    break;
  case 'teams':
    p = reconcileTeams();
    break;
  case null:
    p = showSLOs(cli);
    break;
  default:
    cli.showHelp();
}

p!.catch(console.error);
