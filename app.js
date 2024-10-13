const socket = io();

const messageInput = document.getElementById('message');
const sendButton = document.getElementById('send-message');
const chatBox = document.getElementById('chat-box');

const setUserSection = document.getElementById('set-user-section');
const joinButton = document.getElementById('join-button');
const nicknameInput = document.getElementById('nickname-input');
const ageInput = document.getElementById('age-input');

const male = document.getElementById('gender-male');
const female = document.getElementById('gender-female');

let nickname = '';
let gender = ' ';
let age = ' ';

// Join When "Join" button is clicked
joinButton.addEventListener('click', setUser);
// add user when the "Enter" key is pressed
nicknameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        setUser();
    }
});
function setUser() {
    nickname = nicknameInput.value.trim();
    age =  ageInput.value.trim();
    age = (age > 100)  ? 100 : age;

    gender = (female.checked) ?  'female' : 'male';

    if(!nickname) {
        alert("Please Set Nickname Before Joining");
    }
    else {
        socket.emit('setNickname', nickname, age, gender);
        alert(`Your Nickname is: ${nickname} - ${age} - ${gender}`);
        setUserSection.style.display = 'none';
    }
}

// Update User List
socket.on('updateUserList', (users) => {
    const usersList = document.getElementById('user-list');
    usersList.innerHTML = '';

    users.forEach((user) => {
        const userElement = document.createElement('li');
        const genderElement = document.createElement('i');
        userElement.textContent = `${user.nickname} ${user.age}   `;
        if (user.gender === 'female'){
            userElement.classList.add('user', 'femaleBG');
            genderElement.classList.add('fa-solid', 'fa-venus');
            } else {
                userElement.classList.add('user', 'maleBG');
                genderElement.classList.add('fa-solid', 'fa-mars');
            }
        userElement.appendChild(genderElement);
        usersList.appendChild(userElement);
    });
    
});

// Load Message history
socket.on('loadHistory', (history) =>{
    history.forEach((message) => {
        messageElement = document.createElement('div');
        messageElement.textContent = message.text;
        messageElement.classList.add('chat-bubble', message.gender+"BG");
        chatBox.appendChild(messageElement);
    });
});

// Experiment
const typingTimeoutDuration = 3000; // 3 seconds timeout to stop typing
let typingTimeout;

// Detect when user is typing
messageInput.addEventListener('input', () => {
    socket.emit('typing', nickname);
    
    // Clear previous timeout if the user keeps typing
    clearTimeout(typingTimeout);
    
    // Set a timeout to stop typing after 3 seconds of no input
    typingTimeout = setTimeout(() => {
        socket.emit('stopTyping');
    }, typingTimeoutDuration);
});

// Show "user is typing" message
socket.on('displayTyping', (nickname) => {
    const typingElement = document.getElementById('typing-indicator');
    typingElement.textContent = `${nickname} is typing...`;
    typingElement.style.display = 'block'; // Make it visible
});

// Hide "user is typing" message
socket.on('hideTyping', () => {
    const typingElement = document.getElementById('typing-indicator');
    typingElement.style.display = 'none'; // Hide it
});

// Send message to server
// Send message when "Send" button is clicked
sendButton.addEventListener('click', sendMessage);

// Send message when the "Enter" key is pressed
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

    function sendMessage() {

        if (!nickname) {
            alert('Please set your nickname before sending a message.');
            return;
        }
        const message = messageInput.value;
        if (!message.trim()) {
            return; // Prevent sending empty messages
        }
        const timestamp = new Date().toLocaleTimeString();
        const messageWithTime = {
            text: `${timestamp}- ${nickname} - ${message} `,
            gender: gender
        };
        socket.emit('sendMessage', messageWithTime);
        messageInput.value = ''; // Clear input after sending

    }
    
// Receive message from server
socket.on('receiveMessage', (message) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = message.text;
    messageElement.classList.add('chat-bubble', message.gender+"BG");
    chatBox.appendChild(messageElement);
});

// Private Messages
const sendPrivateButton  = document.getElementById('send-private-message');
const privateId = document.getElementById('private-id');
const privateMessageInput = document.getElementById('private-message');
sendPrivateButton.addEventListener('click', sendPrivateMessage);

// Send private message when the "Enter" key is pressed
privateMessageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendPrivateMessage();
        }
});

function sendPrivateMessage() {
    const  privateMessage = privateMessageInput.value;
    const recipient = privateId.value;
    if (!privateMessage.trim() ||  !recipient.trim()) {
        return; // Prevent sending empty messages
        // alert("something is missing dude");
    }
    socket.emit('sendPrivateMessage', {toNickname:  recipient, message: privateMessage});
    socket.emit('receivePrivateMessage', {fromNickname: nickname,  message: privateMessage});
    privateMessageInput.value = ''; //clear  input after sending
}

//Listen for Private Messages from Server
socket.on('receivePrivateMessage', ({fromNickname, message}) => {
    const privateMessageElement = document.createElement('div');
    privateMessageElement.textContent = `PM from ${fromNickname}: ${message}`;
    privateMessageElement.classList.add('chat-bubble',  'privateBG');
    chatBox.appendChild(privateMessageElement);
});


// Voice Notes
const startRecording = document.getElementById('start-recording');
const stopRecording = document.getElementById('stop-recording');
const audioPreview = document.getElementById('audio-preview');
let mediaRecorder;
let audioChunks = [];

startRecording.addEventListener('click', () => {
    audioChunks = [];
    navigator.mediaDevices.getUserMedia({audio: true})
    .then(stream => {
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.start();

        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });
        
        mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks);
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPreview.src = audioUrl;

            // emit audioBlob to the server
            socket.emit('sendVoiceNote', audioBlob);
        });

        startRecording.disabled = true;
        stopRecording.disabled = false;
    });
});

stopRecording.addEventListener('click', () =>{
    mediaRecorder.stop();
    startRecording.disabled = false;
    stopRecording.disabled = true;
});

socket.on('receiveVoiceNote', (audioBlob) => {
    const audioUrl = URL.createObjectURL(new Blob([audioBlob]));
    const audioElement = document.createElement('audio');
    audioElement.src = audioUrl;
    audioElement.controls = true;
    audioElement.classList.add('voice-note');

    const timestamp = new Date().toLocaleTimeString();
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-bubble',"maleBG");
    messageElement.textContent = `${timestamp} - ${nickname}: `;
    messageElement.appendChild(audioElement);
    chatBox.appendChild(messageElement);

    // chatBox.appendChild(audioElement);
});








// UI show users
const showUsers = document.getElementById('show-users');
const hideUsers = document.getElementById('hide-users');
const aside = document.getElementById('aside');

showUsers.addEventListener('click', () => {
    aside.style.left = 0;
    showUsers.style.display = 'none';
    hideUsers.style.display = 'inline';
});
hideUsers.addEventListener('click', () => {
    aside.style.left = -200 + "px";
    showUsers.style.display = 'inline';
    hideUsers.style.display = 'none';
});