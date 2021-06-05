import WebSocket from 'ws';
import { Response, Request, StreamOptions, StreamTopic } from './interfaces';
import BxgatewayBase from './bxgatewayBase';

export class BxgatewayGo extends BxgatewayBase {
    constructor(url: string, authKey: string) {
        super();
        this._gw = new WebSocket(url, {
            headers: {
                'Authorization': authKey
            },
            rejectUnauthorized: false
        });

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

    subscribe(topic: StreamTopic, options?: StreamOptions) {
        if (!this._gw.OPEN) throw new Error('Websocket connection to gateway closed');
        if (topic === 'newBlocks') throw new Error('newBlocks subscription not implemented in bxgateway-go')

        let req: Request = {
            id: '1',
            method: "subscribe",
            params: [
                topic,
                options
            ]
        };

        this._gw.send(JSON.stringify(req));
    }
}