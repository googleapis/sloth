#!/usr/bin/env node

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

import {gethub} from "./util";
import {GitHubRepoFile} from "./types";

/**
 * Download the index of APIs from GitHub
 * @return {Object}
 */
export async function getIndex() {
    const atob = require('atob');
    const protos: {[index: string]:any} = {};
    // fetch api index from google-cloud-dotnet repo
    try {
        const res = await gethub<GitHubRepoFile>({
            url: `/repos/googleapis/google-cloud-dotnet/contents/apis/ServiceDirectory/directory.json`,
        });
        const res_json = JSON.parse(atob(res.data.content)).Services;
        res_json.map((item: any) => {
            const hostname = item.Name
            if (hostname in protos) {
                if (item.Version !in protos[hostname]["versions"]) {
                    protos[hostname]["versions"].push(item.Version);
                }

            } else {
                protos[hostname] = {"title": item.Title, "versions": [item.Version]};
            }
        });
        console.log(protos);
    }
    catch(e) {
        console.log(e);
        return;
    }
}
