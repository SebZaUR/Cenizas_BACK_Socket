const MAX_PLAYERS_PER_ROOM = 5;
const rooms = {};
const connectedPlayers = {};
const players = [];

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

        // Verificar si la sala está llena
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
        socket.emit('playerNumber', rooms[roomName].players.length);

        // Emitir a todos los jugadores en la sala para actualizar la lista de jugadores
        io.to(roomName).emit('updatePlayers', rooms[roomName].players.map(player => player.id));
    });

   socket.on('updatePlayers', (data) => {
    if (rooms[roomName] && rooms[roomName].players) { // Verificar si rooms[roomName] y rooms[roomName].players están definidos
        const index = rooms[roomName].players.findIndex(player => player.id === socket.id);
        if (index !== -1) {
            rooms[roomName].players[index].posx = data.posx;
            rooms[roomName].players[index].posy = data.posy;
            rooms[roomName].players[index].velocityx = data.velocityx;
            rooms[roomName].players[index].velocityy = data.velocityy;
            rooms[roomName].players[index].animation = data.animation; 
            rooms[roomName].players[index].key = data.key;
        }
        io.to(roomName).emit('updatePlayers', rooms[roomName].players); 
    }
});

socket.on('goToDesert', (data) => {
    io.to(roomName).emit('goToDesert', data); 
});

socket.on('disconnect', () => {
    // Buscar el jugador en todas las salas y eliminarlo si se encuentra
    for (const roomName in rooms) {
        const index = rooms[roomName].players.findIndex(player => player.id === socket.id);
        if (index !== -1) {
            rooms[roomName].players.splice(index, 1);
            // Emitir evento solo a la sala específica para notificar a los jugadores
            io.to(roomName).emit('playerDisconnected', socket.id);
            break; // Romper el bucle una vez que se haya encontrado al jugador
        }
    }
});
});

http.listen(2525, () => {
    console.log('Servidor escuchando en el puerto 2525');
});
