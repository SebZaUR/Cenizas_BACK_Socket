const { emit } = require('process');

const MAX_PLAYERS_PER_ROOM = 5;
const rooms = {};
const playersConect = {};
const coordenadas = {};

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "https://cenizasdelpasadogame.azurewebsites.net",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    let roomName;
    socket.on('joinRoom', (code) => {
        roomName = code;
        if (!rooms[roomName]) {
            rooms[roomName] = {
                players: [],
                skeletonState: { x: 400, y: 400 }
            };
            console.log(`Se ha creado la sala: ${roomName}`);
        }

        if (rooms[roomName].players.length > MAX_PLAYERS_PER_ROOM) {
            socket.emit('lobbyFull');
            socket.disconnect(true);
            return;
        }

        socket.join(roomName);

        const initialCoordinates = { x: 370 + rooms[roomName].players.length * 30, y: 270 };
        const validCoordinates = {x: 370, y: 370};
        rooms[roomName].players.push({ id: socket.id, posx: initialCoordinates.x, posy: initialCoordinates.y, velocityx: 0, velocityy: 0, animation: null });

        socket.emit('initialCoordinates', initialCoordinates, validCoordinates);
        socket.emit('firstPlayer', rooms[roomName].players.length === 1);
        socket.emit('playerNumber', rooms[roomName].players.length, roomName);

        io.to(roomName).emit('updatePlayers', rooms[roomName].players.map(player => player.id));
    });


    socket.on('updatePlayers', (data) => {
        if (rooms[data.code] && rooms[data.code].players) { 
            const index = rooms[data.code].players.findIndex(player => player.id === socket.id);
            if (index !== -1) {
                rooms[data.code].players[index].posx = data.posx;
                rooms[data.code].players[index].posy = data.posy;
                rooms[data.code].players[index].velocityx = data.velocityx;
                rooms[data.code].players[index].velocityy = data.velocityy;
                rooms[data.code].players[index].animation = data.animation;
                rooms[data.code].players[index].key = data.key;
            }
            io.to(data.code).emit('updatePlayers', rooms[data.code].players);
        }
    });

    socket.on('goToDesert', (data) => {
        io.to(roomName).emit('turnOffRoom', roomName);
        io.to(roomName).emit('goToDesert', data);
    });

    socket.on('goToCave', (data) => {
        io.to(roomName).emit('goToCave', data);
    });

    socket.on ('valueCordinates', (data) =>{
        const posicionesInicialesEsqueletos = [];
        const posicionesItems = [];
        const coordenadas = data.validCoordinates;        
        
        function getRandomIndex() {
            return Math.floor(Math.random() * coordenadas.length);
        }
    
        for (let i = 0; i < 7; i++) {
            const index = getRandomIndex();
            posicionesInicialesEsqueletos.push(coordenadas[index]);
        }
    
        for (let i = 0; i < 6; i++) {
            const index = getRandomIndex();
            posicionesItems.push(coordenadas[index]);
        }
        data.posicionesItems = posicionesItems;
        data.posicionesInicialesEsqueletos = posicionesInicialesEsqueletos;
        io.to(roomName).emit('valueCordinates', data);

    });

    socket.on('imHitted', () => {
        for (const roomName in rooms) {
            const index = rooms[roomName].players.findIndex(player => player.id === socket.id);
            if (index !== -1) {
                io.to(roomName).emit('imHitted', socket.id);
                break;
            }
        }
    });

    socket.on('updateSkeleton', (skeletonData) => {
        io.to(skeletonData.code).emit('updateSkeleton', skeletonData);
    });

    socket.on('deadSkeleton', (data) => {
        io.to(data.code).emit('deadSkeleton', data);
    });

    socket.on('directionsEnemys', (data) => {
        io.to(data.code).emit('directionsEnemys', data);
    });

    socket.on('disconnect', () => {
        for (const roomName in rooms) {
            const index = rooms[roomName].players.findIndex(player => player.id === socket.id);
            if (index !== -1) {
                rooms[roomName].players.splice(index, 1);
                io.to(roomName).emit('playerDisconnected', socket.id);
                break;
            }
        }
    });

    socket.on('sendFriendRequest', (data) => {
        console.log(`El usuario con correo electrónico ${data.send} envio una solicitud.`);
        if (playersConect[data.reciever]) {
            setTimeout(() => {
                io.to(playersConect[data.reciever]).emit('friendRequestReceived', data.send);
            }, 2000);
        }
    });

    socket.on('respondRequest', (data) => {
        console.log(`El usuario con correo electrónico ${data.reciever} responde a solicitud de ${data.send} : ${data.respond}`);
        if (playersConect[data.reciever]) {
            setTimeout(() => {
                io.to(playersConect[data.send]).emit('friendRequestRespond', data.respond);
            }, 2000);
        }
    })

    socket.on('registPlayer', (data) => {
        if (!playersConect[data.user]) {
            playersConect[data.user] = data.id;
            console.log(`Se ha registrado el jugador ${data.user}`);
        } else {
            if (playersConect[data.user] != data.id) {
                playersConect[data.user] = data.id;
            }
        }
    })
});

http.listen(2525, () => {
    console.log('Servidor escuchando en el puerto 2525');
});