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

import {Repo, Users, Team} from './types';
import {GaxiosOptions, request} from 'gaxios';

export const repos: Repo[] = require('../../repos.json').repos;
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const users: Users = require('../../users.json');
export const teams: Team[] = require('../../teams.json').teams;
export const languages = [
  'go',
  'nodejs',
  'ruby',
  'python',
  'php',
  'dotnet',
  'java',
  'elixir',
  'cpp',
];

const token = process.env.SLOTH_GITHUB_TOKEN;
if (!token) {
  throw new Error('Please set the `SLOTH_GITHUB_TOKEN` environment variable.');
}

export async function gethub<T = unknown>(options: GaxiosOptions) {
  options.baseURL = 'https://api.github.com';
  options.headers = {
    Authorization: `token ${token}`,
  };
  return request<T>(options);
}
