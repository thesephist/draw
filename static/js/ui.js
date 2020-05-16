const {
    Component,
} = window.Torus;

const MSG = {
    Hello: 0,
    Text: 1,
    ChangeUser: 2,
    PresentUsers: 3,
}

class App extends Component {

    init() {
        this.name = 'user';
        this.color = '#333';
        // Used by presencer
        this.users = [];
        this.conn = null;

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
        this.canvas.addEventListener('touchstart', this.onStart, {
            passive: true,
        });
        this.canvas.addEventListener('mouseup', this.onEnd);
        this.canvas.addEventListener('touchend', this.onEnd);
        this.canvas.addEventListener('mousemove', this.onMove);
        this.canvas.addEventListener('touchmove', this.onMove, {
            passive: true,
        });

        window.addEventListener('resize', this.resize);

        this.connect();
        this.resize();
    }

    remove() {
        window.removeEventListener('resize', this.resize);
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
        const xDif = xPos - this.lastPosX;
        const yDif = yPos - this.lastPosY;

        // radius of stroke is calculated based on speed
        let speed = Math.sqrt((xDif * xDif) + (yDif * yDif));
        if (speed > 20) {
            speed = 20;
        }

        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.color;
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastPosX, this.lastPosY);
        this.ctx.lineTo(xPos, yPos);
        this.ctx.stroke();

        this.lastPosX = xPos;
        this.lastPosY = yPos;

        this.pushPt(this.lastPosX, this.lastPosY);
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

        this.conn.send(JSON.stringify({
            type: MSG.ChangeUser,
            text: `${name}\n${color}`,
        }));
    }

    compose() {
        return jdom`<div class="app">
            <nav>
                nav bar.
            </nav>
            ${this.canvas}
        </div>`;
    }

    render(...args) {
        this.emptyCanvas();
        for (const curve of this.curves) {
            this.drawCurve(curve);
        }

        super.render(...args);
    }

}

const app = new App();
document.getElementById('root').appendChild(app.node);
