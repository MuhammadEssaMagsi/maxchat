const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
let users = [];
let messageHistory = [];

// Serve static files
app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('New User Connected');
    
    // Send message history to new user
    socket.emit('loadHistory', messageHistory);

    socket.on('setNickname', (nickname, age, gender) => {
        if(!nickname) return;
        users.push({id: socket.id, nickname, age, gender});
        console.log('Users:', users);
        io.emit('updateUserList', users);
    });


    // Listen for 'typing' event and broadcast to others
    socket.on('typing', (nickname) => {
        socket.broadcast.emit('displayTyping', nickname);
    });

    // Listen for 'stopTyping' event and broadcast to others
    socket.on('stopTyping', () => {
        socket.broadcast.emit('hideTyping');
    });

    socket.on('sendMessage', (message) => {
        messageHistory.push(message); //save messages to history
        io.emit('receiveMessage', message); // Send the message to all clients
    });
    
    // Handle Private message
    socket.on('sendPrivateMessage', ({toNickname, message}) => {
        const recipient = users.find(user => user.nickname === toNickname);
        if(recipient) {
            const sender =  users.find(user => user.id === socket.id);
            
            if(sender) {
                io.to(recipient.id).emit('receivePrivateMessage', {
                    fromNickname: sender.nickname,
                    message
                })
            }
        } else {
            socket.emit('privateMessageError', `User ${toNickname} not found.`);
        }
    });

// voicenotes
socket.on('sendVoiceNote', (audioBlob) => {
    io.emit('receiveVoiceNote', audioBlob);
});




// disconnection 
    socket.on('disconnect', () => {
        users = users.filter(user => user.id !== socket.id);
        io.emit('updateUserList', users);
        console.log('User disconnected, Updated users list: ', users);
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});