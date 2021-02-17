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

import {google} from 'googleapis';

/**
 * Create an Auth client for googleapis
 */
async function createAuthClient() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const authClient = await auth.getClient();
    return authClient;
}

/**
 * Make a call to the Google Cloud Service Management API's services.list endpoint
 * @return {string[]} an array of hostnames ('foo.googleapis.com') for all available services
 */
export async function getAllServiceNames(): Promise<string[]> {
    try {
        const client = google.servicemanagement('v1');
        const authClient = await createAuthClient();
        const serviceNames: string[] = [];
        return await listServices(client, authClient, serviceNames);
    }
    catch(e) {
        console.log(e);
        throw e;
    }
}

export async function listServices(client: any, authClient: any, serviceNames: string[],
                                   nextPageToken: string = ''): Promise<any> {
    const res = await client.services.list({
        auth: authClient,
        pageSize: 100,
        pageToken: nextPageToken,
    },{
        retryConfig: {
            retry: 10,
        }
    });

    if (res.data.services) {
        res.data.services.map((item: any) => {
            serviceNames.push(item.serviceName)
        });
    }

    if (res.data.nextPageToken) {
        await listServices(client, authClient, serviceNames, res.data.nextPageToken);
    }
    return serviceNames;
}

/**
 * Make a call to the Google Cloud Service Management API's services.getConfig endpoint
 * @param {string} serviceName - the hostname of a service ('foo.googleapis.com')
 * @return {Object} the service config of the passed hostname
 */
export async function getServiceConfig(serviceName: string): Promise<any> {
    try {
        const servicemanagement = google.servicemanagement('v1');
        const authClient = await createAuthClient();
        const res = await servicemanagement.services.getConfig({
            auth: authClient,
            serviceName: serviceName,
        },{
            retryConfig: {
                retry: 10,
            }
        });
        return res.data;
    }
    catch(e) {
        console.log(e);
        throw e;
    }
}

/**
 * Get service configs for all available services.
 * @return {Object}
 */
export async function getAllServiceConfigs(): Promise<any> {
    try {
        const serviceNames = await getAllServiceNames();
        const serviceConfigs = serviceNames.map(async (name: string) => {
            await getServiceConfig(name);
        });
        return serviceConfigs;
    }
    catch(e) {
        console.log(e);
        throw e;
    }
}
