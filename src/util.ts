import Octokit, {AnyResponse} from '@octokit/rest';
import {Repo, Label, Users} from './types';

export const repos: Repo[] = require('../../repos.json').repos;
export const labels: Label[] = require('../../labels.json').labels;
export const users: Users = require('../../users.json');
export const languages = ['go', 'nodejs', 'ruby', 'python', 'php', 'dotnet', 'java'];

const token = process.env.SLOTH_GITHUB_TOKEN;
if (!token) {
  throw new Error('Please set the `SLOTH_GITHUB_TOKEN` environment variable.');
}

const octo = new Octokit();
octo.authenticate({token, type: 'token'});

export {octo};
