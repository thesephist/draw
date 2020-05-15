const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const enterForm = $('#enterForm');
const verifyForm = $('#verifyForm');
const messageForm = $('#messageForm');

const TYPE = {
    Hello: 0,
    Text: 1,

    Auth: 2,
    AuthAck: 3,
    AuthRst: 4,

    MayNotEnter: 5,
}

function show(el) {
    el.style.display = 'flex';
}

function hide(el) {
    el.style.display = 'none';
}

function scrollToEnd() {
    const container = $('.messageList');
    container.scrollTop = container.scrollHeight;
}

function logMessage(user, text) {
    const messageList = $('.messageList');
    
    // if there are too may messages in the log (>500), remove one
    if (messageList.childNodes.length > 500) {
        messageList.removeChild(messageList.childNodes[0]);
    }

    const item = document.createElement('li');
    item.classList.add('messageItem');

    const userSpan = document.createElement('span');
    userSpan.classList.add('user');
    userSpan.textContent = `@${user}:`;
    userSpan.style.color = colorizeString(user);

    const textSpan = document.createElement('span');
    textSpan.classList.add('text');
    textSpan.textContent = text;

    item.appendChild(userSpan);
    item.appendChild(document.createTextNode(' '));
    item.appendChild(textSpan);

    $('.messageList').appendChild(item);
    scrollToEnd();
}

let conn = null;

function connect(name, email) {
    if (window.location.protocol === 'https:') {
        conn = new WebSocket(`wss://${window.location.host}/connect`);
    } else {
        conn = new WebSocket(`ws://${window.location.host}/connect`);
    }
    conn.addEventListener('open', evt => {
        conn.send(JSON.stringify({
            type: TYPE.Hello,
            text: `${name}\n${email}`,
        }))

        hide(enterForm);
        show(verifyForm);
        verifyForm.querySelector('[name="token"]').focus();
    });
    conn.addEventListener('message', evt => {
        const message = JSON.parse(evt.data);

        if (window.__debug__) {
            console.info(message);
        }

        switch (message.type) {
            case TYPE.Hello:
                break;
            case TYPE.Text:
                logMessage(message.user.name, message.text);
                break;
            case TYPE.Auth:
                break;
            case TYPE.AuthAck:
                hide(verifyForm);
                show(messageForm);
                messageForm.querySelector('[name="text"]').focus();
                // Since currently leaving the page
                // breaks the WebSocket session and effectively logs
                // the user out, we ask for confirmation here.
                window.addEventListener('beforeunload', evt => {
                    evt.preventDefault();
                    evt.returnValue = '';
                });
                break;
            case TYPE.AuthRst:
                window.alert('Verification failed: incorrect token');
                break;
            case TYPE.MayNotEnter:
                show(enterForm);
                hide(verifyForm);
                enterForm.querySelector('input[name="name"]').focus();
                // we double-rAF here to make sure the previous frame (hiding
                // the verification form) paints on screen. Kind of a cheap hack but
                // the frontend isn't really important to me in this app.
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        window.alert('Another user is already using that username. Try a different one.');
                    });
                });
                break;
            default:
                console.error('Unknown message type:', evt.data);
        }
    });
    conn.addEventListener('error', evt => {
        console.log('WebSocket error:', evt);
    });
}

function verify(token) {
    if (conn === null) {
        return;
    }

    conn.send(JSON.stringify({
        type: TYPE.Auth,
        text: token,
    }));
}

function send(text) {
    if (conn === null) {
        return;
    }

    conn.send(JSON.stringify({
        type: TYPE.Text,
        text: text,
    }));
}

function close() {
    if (conn === null) {
        return;
    }

    conn.close();
    conn = null;
}

function colorizeString(s) {
    let hash = 0;
    for (let i = 0, len = s.length; i < len; i ++) {
        let ch = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash = hash & hash;
    }
    return `hsl(${Math.abs(hash % 360)}, 90%, 36%)`
}

enterForm.addEventListener('submit', evt => {
    evt.preventDefault();

    const name = enterForm.querySelector('[name="name"]').value;
    const email = enterForm.querySelector('[name="email"]').value;

    if (!name || !email) {
        return
    }

    connect(name, email);
});

verifyForm.addEventListener('submit', evt => {
    evt.preventDefault();

    const token = verifyForm.querySelector('[name="token"]').value;
    if (!token.trim()) {
        return
    }

    verify(token);
})

messageForm.addEventListener('submit', evt => {
    evt.preventDefault();

    const textInput = messageForm.querySelector('[name="text"]');
    const text = textInput.value;

    if (!text.trim()) {
        return;
    }

    send(text);
    textInput.value = '';
});

hide(verifyForm);
hide(messageForm);
