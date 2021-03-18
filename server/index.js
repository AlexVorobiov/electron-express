const express = require('express');
const find = require('local-devices');
const axios = require('axios').default;
const os = require('os');
const Chance = require('chance')();

const SERVER_ENV_NAME = 'server';
const CLIENT_ENV_NAME = 'client';

module.exports = async (
    host = '127.0.0.1', port = 3000, isDebug = false, env = CLIENT_ENV_NAME
) => {
    const APP_NAME = Chance.twitter();
    const ALLOWED_SERVER_PORT = 3001;

    host = env === SERVER_ENV_NAME ? '0.0.0.0' : host;
    let IS_CONNECTED = false;
    const SERVER_INFO = {
        name: null,
        ip: null
    };


    const app = express()


    // try connect to local machine, use only for debug
    if (isDebug) {
        try {
            const response = await axios.get(`http://127.0.0.1:${ALLOWED_SERVER_PORT}/connect`);
            console.log(response.status, response.data)
            if (response.status === 200) {
                IS_CONNECTED = true;
                SERVER_INFO.ip = '127.0.0.1';
                SERVER_INFO.name = response.data.name
            } else {
                IS_CONNECTED = false;
                SERVER_INFO.name = '';
                SERVER_INFO.ip = '';
            }
        } catch (e) {
            console.log('Exception connect to local', e.message)
            IS_CONNECTED = false;
            SERVER_INFO.name = '';
            SERVER_INFO.ip = '';
        }
    }


    // If this is client try to find server
    if (env === CLIENT_ENV_NAME && !isDebug) {
        const devices = await find();
        console.log('try to connect ', devices)
        for (const device of devices) {
            const url = `http://${device.ip}:${ALLOWED_SERVER_PORT}/connect`;

            try {
                const response = await axios.get(url);
                if (response.status === 200) {
                    SERVER_INFO.ip = device.ip;
                    SERVER_INFO.name = response.data.name;
                } else {
                    SERVER_INFO.name = '';
                    SERVER_INFO.ip = '';
                }
                console.log(response.status)
            } catch (e) {
                console.log('Exception', e.message)
                SERVER_INFO.name = '';
                SERVER_INFO.ip = '';
            }
        }
    }

    process.on('unhandledRejection', (reason, p) => {
        if (reason.code && reason.code === 'ECONNREFUSED') {
            SERVER_INFO.name = '';
            SERVER_INFO.ip = '';
            IS_CONNECTED = false;
        } else {
            throw reason;
        }
    });

    if (env === CLIENT_ENV_NAME) {
        // sockets will be used
        setInterval(async () => {
            try {
                axios.get(`http://127.0.0.1:${ALLOWED_SERVER_PORT}/connect`)
                    .then((response) => {
                        console.log('server', response.data);
                        if (response.status === 200) {
                            SERVER_INFO.name = response.data.name;
                            SERVER_INFO.ip = '127.0.0.1';
                            IS_CONNECTED = true;
                        } else {
                            SERVER_INFO.name = '';
                            SERVER_INFO.ip = '';
                            IS_CONNECTED = false;
                        }
                    })
            } catch (e) {
                // console.log('Exception:', e)
                SERVER_INFO.name = '';
                SERVER_INFO.ip = '';
            }
        }, 4000)
    }


    app.get('/status', (req, res) => {
        res.send({
            iAm: env,
            name: APP_NAME,
            connectedToMainServer: IS_CONNECTED,
            server: SERVER_INFO

        })
    })

    app.get('/connect', (req, res) => {
        res.send({
            iAm: env,
            name: APP_NAME
        })
    })

    app.get('/whoami', (req, res) => {
        res.send({
            iAm: env,
            name: APP_NAME
        })
    })
    app.get('/', (req, res) => {
        res.send({msg: `Server started on ${env} listen http://${host}:${port}`})
    })

    app.listen(port, host, () => {
        console.log(`Example app listening at http://localhost:${port}`)
        console.log(`Instance name ${APP_NAME}`);
    })
}
