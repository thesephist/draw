const {
    Component,
} = window.Torus;

const MSG = {
    Hello: 0,
    Text: 1,
    ChangeUser: 2,
    PresentUsers: 3,
}

class UserEditDialog extends Component {

    init(name, color, saveCallback) {
        this.name = name;
        this.color = color;

        this.saveCallback = saveCallback;
        this.handleNameInput = this.handleInput.bind(this, 'name');
        this.handleColorInput = this.handleInput.bind(this, 'color');
    }

    handleInput(label, evt) {
        const value = evt.target.value;
        this[label] = value;
        this.render();
    }

    compose() {
        return jdom`<div class="userEditDialog-wrapper">
            <div class="userEditDialog">
                <div class="userEditDialog-form fixed block">
                    <div class="inputGroup">
                        <label for="ued--name">Name</label>
                        <div class="inputWrapper fixed block">
                            <input type="text" placeholder="User" id="ued--name"
                                autofocus
                                value="${this.name}"
                                oninput="${this.handleNameInput}"/>
                        </div>
                    </div>

                    <div class="inputGroup">
                        <label for="ued--color">Color</label>
                        <div class="inputWrapper fixed block">
                            <input type="color" id="ued--color"
                                value="${this.color}"
                                oninput="${this.handleColorInput}"/>
                        </div>
                    </div>

                    <button onclick="${evt => {
                        this.saveCallback(this.name, this.color);
                    }}" class="updateButton accent block">Update</button>
                </div>
            </div>
        </div>`;
    }

}

class App extends Component {

    init() {
        this.name = 'user';
        this.color = '#333333';
        // attempt to restore previous name, color
        this.tryRestoreState();

        this.editingUser = true;
        this.dialog = new UserEditDialog(this.name, this.color, (name, color) => {
            this.changeUser(name, color);
            this.editingUser = false;
            this.render();
        });
        this.conn = null;

        // Used by presencer
        this.users = [];
        // canvas states
        this.curves = [];
        this.currentCurve = [];
        // is the mouse being dragged (clicked down)?
        this.isDragging = false;
        // last positions used to calculated speed
        //  and thickness of stroke
        this.lastPosX = null;
        this.lastPosY = null;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.resize = this.resize.bind(this);
        this.onStart = this.onStart.bind(this);
        this.onEnd = this.onEnd.bind(this);
        this.onMove = this.onMove.bind(this);

        this.canvas.addEventListener('mousedown', this.onStart);
        this.canvas.addEventListener('touchstart', this.onStart);
        this.canvas.addEventListener('mouseup', this.onEnd);
        this.canvas.addEventListener('touchend', this.onEnd);
        this.canvas.addEventListener('mousemove', this.onMove);
        this.canvas.addEventListener('touchmove', this.onMove);

        window.addEventListener('resize', this.resize);

        this.connect();
        this.resize();
    }

    remove() {
        window.removeEventListener('resize', this.resize);
    }

    saveState() {
        window.localStorage.setItem('state0', JSON.stringify({
            name: this.name,
            color: this.color,
        }));
    }

    tryRestoreState() {
        const stateString = window.localStorage.getItem('state0');
        if (stateString === null) {
            return;
        }

        try {
            const state = JSON.parse(stateString);
            this.name = state.name;
            this.color = state.color;
        } catch (e) {
            console.error(e);
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    }

    connect() {
        if (window.location.protocol === 'https:') {
            this.conn = new WebSocket(`wss://${window.location.host}/connect`);
        } else {
            this.conn = new WebSocket(`ws://${window.location.host}/connect`);
        }
        this.conn.addEventListener('open', evt => {
            this.conn.send(JSON.stringify({
                type: MSG.Hello,
                text: `${this.name}\n${this.color}`,
            }))
        });
        this.conn.addEventListener('message', evt => {
            const message = JSON.parse(evt.data);

            switch (message.type) {
                case MSG.Hello: {
                    const [name, color] = message.text.split('\n');
                    if (!name || !color) {
                        break;
                    }
                    this.users.push({name, color});
                    this.render();
                    break;
                }
                case MSG.Text:
                    try {
                        const curve = JSON.parse(message.text);
                        this.curves.push(curve);
                        this.render();
                    } catch (e) {
                        console.error('Error marshaling received curve.', e);
                    }
                    break;
                case MSG.ChangeUser: {
                    const prev = message.user;
                    const [name, color] = message.text.split('\n');
                    if (!name || !color) {
                        break;
                    }

                    for (const u of this.users) {
                        if (u.name === prev.name && u.color === prev.color) {
                            u.name = name;
                            u.color = color;
                            break;
                        }
                    }

                    this.render();
                    break;
                }
                case MSG.PresentUsers:
                    try {
                        const presentUsers = JSON.parse(message.text);
                        this.users = presentUsers;
                        this.render();
                    } catch (e) {
                        console.error('Error marshaling received users.', e);
                    }
                    break;
                default:
                    console.error('Unknown message type:', evt.data);
            }
        });
        this.conn.addEventListener('error', evt => {
            console.log('WebSocket error:', evt);
        });
    }

    send(text) {
        if (this.conn === null) {
            return;
        }

        this.conn.send(JSON.stringify({
            type: MSG.Text,
            text: text,
        }));
    }

    pushPt(x, y) {
        this.currentCurve.push([x, y]);
    }

    pushCurve() {
        const curve = {
            color: this.color,
            points: this.currentCurve,
        }
        this.currentCurve = [];
        this.curves.push(curve);

        this.send(JSON.stringify(curve));
    }

    onStart(evt) {
        evt.preventDefault();
        if (evt.touches) {
            evt = evt.touches[0];
        }
        this.isDragging = true;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;

        this.pushPt(this.lastPosX, this.lastPosY);
    }

    onEnd(evt) {
        evt.preventDefault();
        if (evt.touches) {
            evt = evt.touches[0];
        }
        this.isDragging = false;
        this.lastPosX = null;
        this.lastPosY = null;

        this.pushCurve();
    }

    onMove(evt) {
        evt.preventDefault();
        if (evt.touches) {
            evt = evt.touches[0];
        }
        if (!this.isDragging) {
            return;
        }

        const xPos = evt.clientX;
        const yPos = evt.clientY;

        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.color;
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastPosX, this.lastPosY);
        this.ctx.lineTo(xPos, yPos);
        this.ctx.stroke();

        this.lastPosX = xPos;
        this.lastPosY = yPos;

        this.pushPt(xPos, yPos);
    }

    emptyCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawCurve(curve) {
        const {color, points} = curve;
        let lastPt = points[0];
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = color;
        for (const pt of points.slice(1)) {
            this.ctx.beginPath();
            this.ctx.moveTo(lastPt[0], lastPt[1]);
            this.ctx.lineTo(pt[0], pt[1]);
            this.ctx.stroke();

            lastPt = pt;
        }
    }

    changeUser(name, color) {
        this.name = name;
        this.color = color;

        if (this.conn === null) {
            return;
        }

        this.saveState();
        this.conn.send(JSON.stringify({
            type: MSG.ChangeUser,
            text: `${name}\n${color}`,
        }));
    }

    compose() {
        const User = u => jdom`<div class="avatar fixed block">
            <div class="avatar-icon" style="background:${u.color}"></div>
            <div class="avatar-name">${u.name}</div>
        </div>`;

        return jdom`<div class="app">
            ${this.canvas}
            <nav class="nav">
                <div class="users">
                    ${this.users.map(User)}
                </div>
                <button class="avatarEditButton accent block" onclick="${() => {
                    this.editingUser = !this.editingUser;
                    this.render();
                }}">edit my info</button>
            </nav>
            ${this.editingUser ? this.dialog.node : null}
        </div>`;
    }

    render(...args) {
        this.emptyCanvas();
        for (const curve of this.curves) {
            this.drawCurve(curve);
        }
        this.drawCurve({
            color: this.color,
            points: this.currentCurve,
        });

        super.render(...args);
    }

}

const app = new App();
document.getElementById('root').appendChild(app.node);
