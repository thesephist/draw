# draw

draw is a tiny in-memory collaborative whiteboard. It's built on...

- [Gorilla WebSocket](https://github.com/gorilla/websocket) for initiating and managing WebSocket connections
- [Torus](https://github.com/thesephist/torus) as a light frontend UI library
- My own [blocks.css](https://thesephist.github.io/blocks.css/) to add some spice to the UI design

## Todo items

- [ ] Optimize curve data in transit (so we don't send 400-1000 points in a single websocket message when e.g. 120 will do)
- [ ] User presence -- notify clients when clients leave

## Deploy

Deployment is managed by systemd. Copy the `draw.service` file to `/etc/systemd/system/draw.service` and update:

- replace `draw-user` with your Linux user
- replace `/home/draw-user/draw` with your working directory (path to repository or a copy of `static/`)

Then start draw as a service:

```sh
systemctl daemon-reload # reload systemd script
systemctl start draw   # start draw server as a service
```
