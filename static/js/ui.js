const {
    Component,
} = window.Torus;

const MSG = {
    Hello: 0,
    Text: 1,
    SetName: 2,
    SetColor: 3,
}

class App extends Component {
    
    init() {
        this.name = 'user';
        this.color = '#333';
        this.conn = null;

        this.curves = [];
        this.canvas = document.createElement('canvas');

        this.connect();
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
                case MSG.Hello:
                    break;
                case MSG.Text:
                    break;
                case MSG.SetName:
                    break;
                case MSG.SetColor:
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
        if (conn === null) {
            return;
        }

        conn.send(JSON.stringify({
            type: MSG.Text,
            text: text,
        }));
    }

    emptyCanvas() {
        // TODO
    }

    drawCurve(curve) {
        // TODO: draw a curve, line segments connecting points
    }

    compose() {
        return jdom`<div class="app">
            <nav>
                Play
            </nav>
            ${this.canvas}
        </div>`;
    }

    render(...args) {
        this.emptyCanvas();
        for (const curve of this.curves) {
            this.drawCurve();
        }

        super.render(...args);
    }

}

const app = new App();
document.getElementById('root').appendChild(app.node);
