const MAX_PLAYERS_PER_ROOM = 5;
const rooms = {};

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    let roomName;
    socket.on('joinRoom', ( code ) => {
         roomName = code;
        
        // Verificar si la sala ya existe
        if (!rooms[roomName]) {
            // Crear la sala si no existe
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
        console.log(rooms[roomName].players.length)

        // Unir al jugador a la sala
        socket.join(roomName);

        // Emitir eventos de inicialización al jugador que se une
        const initialCoordinates = { x: 370 + rooms[roomName].players.length * 30, y: 270 };
        rooms[roomName].players.push({ id: socket.id, posx: initialCoordinates.x, posy: initialCoordinates.y, velocityx: 0, velocityy: 0, animation: null });

        socket.emit('initialCoordinates', initialCoordinates);
        socket.emit('firstPlayer', rooms[roomName].players.length === 1);
        socket.emit('playerNumber', rooms[roomName].players.length, roomName);

        // Emitir a todos los jugadores en la sala para actualizar la lista de jugadores
        io.to(roomName).emit('updatePlayers', rooms[roomName].players.map(player => player.id));
    });

   socket.on('updatePlayers', (data) => {
    if (rooms[data.code] && rooms[data.code].players) { // Verificar si rooms[roomName] y rooms[roomName].players están definidos
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

    socket.on('updateSkeleton', (skeletonData) => {
        const skeletonState = skeletonData;
        io.emit('updateSkeleton', skeletonData);
    });
socket.on('updateSkeleton', (skeletonData) => {
    skeletonState = skeletonData;
    io.to(skeletonData.code).emit('updateSkeleton', skeletonData);
});

socket.on('goToDesert', (data) => {
    io.to(roomName).emit('goToDesert', data); 
});

socket.on('disconnect', () => {
    for (const roomName in rooms) {
        const index = rooms[roomName].players.findIndex(player => player.id === socket.id);
        if (index !== -1) {
            rooms[roomName].players.splice(index, 1);
            io.to(roomName).emit('playerDisconnected', socket.id);
            break; // Romper el bucle una vez que se haya encontrado al jugador
        }
    }
});
});

http.listen(2525, () => {
    console.log('Servidor escuchando en el puerto 2525');
});