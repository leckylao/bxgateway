import WebSocket from 'ws';
import { Agent } from 'https'
import axios from 'axios';
import fs from 'fs';

import BxgatewayBase from './bxgatewayBase';
import { Response, Request, AuthOptions, BundleSimulationOptions, BundleSubmissionOptions } from './interfaces';

export class CloudGateway extends BxgatewayBase {
    private _http: boolean = false;
    private _httpsAgent: Agent;
    private _url: string;
    private readonly _authorizationKey: string;

    constructor(url: string, authOpts: AuthOptions) {
        super();

        this._url = url;

        if (authOpts.authorization) {
            if (url.includes('http')) {
                // Not a websocket gateway
                this._authorizationKey = authOpts.authorization;
                this._http = true;
                this._httpsAgent = new Agent({
                    rejectUnauthorized: false
                });
                return;
            }

            // Non-enterprise gateway or MEV endpoint
            this._gw = new WebSocket(
                url,
                {
                    headers: {
                        'Authorization': authOpts.authorization
                    },
                    rejectUnauthorized: false
                }
            );
        } else {
            // Enterprise gateway
            this._gw = new WebSocket(
                url,
                {
                    cert: fs.readFileSync(authOpts.certPath!),
                    key: fs.readFileSync(authOpts.keyPath!),
                    rejectUnauthorized: false
                }
            );
        }

        // Pass on
        this._gw.on('open', () => this.emit('open'));
        this._gw.on('close', () => this.emit('close'));
        this._gw.on('error', (err) => this.emit('error', err));

        // Modify default messages to be more useful
        this._gw.on('message', (msg: string) => {
            const data: Response = JSON.parse(msg);
            if (data.params) this.emit('message', data.params.result);
        });
    }

    async simulateBundle(bundle: string[], blockNumber: number, options?: BundleSimulationOptions): Promise<any> {
        if (!this._http) throw new Error(`Wrong endpoint: ${this._url} (not HTTP)`)
        bundle = bundle.map(tx => tx.startsWith('0x') ? tx.slice(2) : tx);

        const req: Request = {
            method: 'blxr_simulate_bundle',
            id: 1,
            params: {
                transaction: bundle,
                block_number: blockNumber.toString(16),
                state_block_number: options?.stateBlockNumber,
                timestamp: options?.timestamp
            }
        }

        console.log(JSON.stringify(req));

        return (await axios.post(this._url,
            JSON.stringify(req),
            {
                headers: {
                    'Authorization': this._authorizationKey,
                    'Content-Type': 'application/json'
                },
                httpsAgent: this._httpsAgent,
            }
        )).data;
    }

    async submitBundle(bundle: string[], blockNumber: number, options?: BundleSubmissionOptions): Promise<any> {
        if (!this._http) throw new Error(`Wrong endpoint: ${this._url} (not HTTP)`)
        bundle = bundle.map(tx => tx.startsWith('0x') ? tx.slice(2) : tx);

        const req: Request = {
            method: 'blxr_submit_bundle',
            id: 1,
            params: {
                transaction: bundle,
                block_number: blockNumber.toString(16),
                min_timestamp: options?.minTimestamp,
                max_timestamp: options?.maxTimestamp
            }
        }

        return (await axios.post(this._url,
            JSON.stringify(req),
            {
                headers: {
                    'Authorization': this._authorizationKey,
                    'Content-Type': 'application/json'
                },
                httpsAgent: this._httpsAgent,
            }
        )).data;
    }
}