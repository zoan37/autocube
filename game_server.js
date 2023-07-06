import compression from 'compression';
import express from 'express';
import cors from 'cors';

import cookieParser from 'cookie-parser';

import http from 'http';
import { Server } from 'socket.io';

import { Web3Storage } from 'web3.storage';
import { Readable } from 'stream';

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const { DATABASE_URL } = process.env;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function writeObject(object) {
    console.log('writing object to database');
    
    // TODO: add timestamp column
    const client = await pool.connect();
    try {
        const text = 'INSERT INTO objects(world_id, cid, filename, object) VALUES($1, $2, $3, $4)';
        const values = [object.world_id, object.cid, object.filename, object.object];
        
        try {
            await client.query(text, values);
            console.log('inserted');
        } catch (err) {
            console.log(err.stack);
        }
    } finally {
        client.release();
    }
}

function dataUriToFileObject(dataUri, filename) {
    const base64String = dataUri.split(',')[1];
    const buffer = Buffer.from(base64String, 'base64');

    const fileObject = {
        name: filename,
        stream: function () {
            const readableStream = new Readable({
                read() {
                    this.push(buffer);
                    this.push(null);  // Signal the end of data.
                }
            });
            return readableStream;
        },
        // size: buffer.length
    };

    return fileObject;
}

function startServer() {
    const app = express()
    const port = 6483;

    var corsOptions = {
        origin: '*', // TODO: wildcard origin is not secure
        optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }
    app.use(cors(corsOptions));

    const web3Storage = new Web3Storage({ token: process.env.WEB3_STORAGE_API_TOKEN });

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            // TODO: add origins from .env file
            // TODO: wildcard origin is not secure
            origin: [
                '*'
            ],
            methods: ["GET", "POST"]
        }
    });

    app.use(express.urlencoded({ extended: true }));

    // compress all responses
    app.use(compression());

    app.use(cookieParser());

    const userMap = {};
    const socketMap = {};

    app.get('/', (req, res) => {
        res.send("Hi! I'm a game server.");
    });

    // Uploading ply files to IPFS is more scalable (50 people in a room can fetch the same file from IPFS).
    // The game server directly serving the ply file consumes too much bandwidth.
    app.post('/upload_ply', express.json({ limit: '10mb' }), async (req, res) => {
        try {
            // parse the request body
            const { worldId, prompt, plyUri, object } = req.body;

            const name = prompt + '.ply';
            const file = dataUriToFileObject(plyUri, name);

            const files = [file];
            const rootCid = await web3Storage.put(files);

            await writeObject({
                world_id: worldId,
                cid: rootCid,
                filename: name,
                object
            });

            res.json({
                rootCid: rootCid,
                filename: name
            });
        } catch (e) {
            console.error(e);
            res.status(500).send(e);
        }
    });

    io.on('connection', (socket) => {
        console.log('a user connected');

        socket.on('chat_message', (msg) => {
            const roomId = msg.roomId;
            io.to(roomId).emit('chat_message', msg);
        });

        socket.on('position', (msg) => {
            const roomId = msg.roomId;

            // console.log('position', msg);
            socket.to(roomId).emit('position', msg);

            if (!userMap[msg.playerId]) {
                socket.join(roomId);
            }
            userMap[msg.playerId] = msg;
            socketMap[socket.id] = msg.playerId;
        });

        socket.on('action', (msg) => {
            const roomId = msg.roomId;

            console.log('action', msg);
            socket.to(roomId).emit('action', msg);
        });

        socket.on('disconnect', () => {
            try {
                console.log('user disconnected');
                var playerId = socketMap[socket.id];
                var user = userMap[playerId];

                const roomId = user.roomId;

                socket.to(roomId).emit('leave', user);

                delete socketMap[socket.id];
                delete userMap[playerId];
            } catch (e) {
                console.error(e);
            }
        });
    });

    server.listen(port, () => {
        console.log('listening on *:' + port);
    });
}

startServer();