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

const {google} = require('googleapis');
const serviceNames: string[] = [];

async function createAuthClient() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const authClient = await auth.getClient();
    return authClient;
}

export async function getAllServiceNames(nextPageToken: string = ''): Promise<string[]> {
    try {
        const servicemanagement = google.servicemanagement('v1');
        const authClient = await createAuthClient();

        const res = await servicemanagement.services.list({
            auth: authClient,
            pageSize: '100',
            pageToken: nextPageToken,
        });

        res.data.services.map((item: any) => {
            serviceNames.push(item.serviceName);
            }
        );

        if (res.data.nextPageToken) {
            await getAllServiceNames(res.data.nextPageToken);
        }
        return serviceNames;
    }
    catch(e) {
        console.log(e);
        throw new Error("Yikes!");
    }
}

export async function getServiceConfig(serviceName: string): Promise<any> {
    try {
        const servicemanagement = google.servicemanagement('v1');
        const authClient = await createAuthClient();
        const res = await servicemanagement.services.configs.get({
            auth: authClient,
            serviceName: serviceName,
        });
        return res.data;
    }
    catch(e) {
        console.log(e);
        throw new Error("Wu-oh!");
    }
}

getAllServiceNames().then(names => {
    console.log(names);
    return names;
}).then(arr =>
    console.log(arr.length)
);

getServiceConfig('vision.googleapis.com').then(config => {
    console.log(config)
});
