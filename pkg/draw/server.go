// Package draw provides a tiny WebSocket-based chat server
package draw

import (
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"golang.org/x/time/rate"
)

const maxTextLen = 65536
const wsTimeout = 60 * time.Second
const pingPeriod = wsTimeout * 9 / 10

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "https://draw.linus.zone" || origin == "http://localhost:1243"
	},
}

// Server represents an instance of a draw chat web server
type Server struct {
	Room       *Room
	BotClient  *Client
	loginCodes map[string]User
}

func (srv *Server) connect(rm *Room, w http.ResponseWriter, r *http.Request) {
	// since two threads access the connection, we guard writes
	// to the WS connection with connlock
	connlock := sync.Mutex{}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	var client *Client

	go func() {
		for {
			time.Sleep(pingPeriod)

			connlock.Lock()
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				if client != nil {
					client.Leave()
				}
				return
			}
			connlock.Unlock()
		}
	}()

	// max 10 per second, 1 message at once
	messageLimiter := rate.NewLimiter(10, 1)
	for {
		var msg Message

		err := conn.ReadJSON(&msg)
		connlock.Lock()
		if err != nil {
			log.Printf("WebSocket JSON read error: %v", err)

			if client != nil {
				client.Leave()
			}

			break
		}
		connlock.Unlock()

		switch msg.Type {
		case msgHello:
			parts := strings.Split(msg.Text, "\n")
			if len(parts) != 2 {
				// malformed hello message
				break
			}

			u := User{
				Name:  parts[0],
				Color: parts[1],
			}

			client = srv.Room.Enter(u)
			client.OnMessage = func(msg Message) {
				connlock.Lock()
				conn.WriteJSON(msg)
				connlock.Unlock()
			}
			client.Send(msgHello, msg.Text)

			// notify client of other active users
			client.BroadcastUserList()

			log.Println("msgHello", u.Name, u.Color)
		case msgText:
			if client == nil {
				break
			}

			if !messageLimiter.Allow() {
				break
			}

			if len(msg.Text) > maxTextLen {
				msg.Text = msg.Text[0:maxTextLen]
			}
			client.Send(msgText, msg.Text)

			log.Println("msgText", len(msg.Text))
		case msgChangeUser:
			parts := strings.Split(msg.Text, "\n")
			if len(parts) != 2 {
				// malformed hello message
				break
			}

			if client == nil {
				break
			}

			if !messageLimiter.Allow() {
				break
			}

			if len(msg.Text) > maxTextLen {
				msg.Text = msg.Text[0:maxTextLen]
			}
			client.Send(msgChangeUser, msg.Text)

			// change existing user details after ChangeUser
			// message has been sent on behalf of old user
			client.User.Name = parts[0]
			client.User.Color = parts[1]

			log.Println("msgChangeUser", client.User.Name, client.User.Color)
		default:
			log.Printf("unknown message type: %v", msg)
		}
	}
}

func handleHome(w http.ResponseWriter, r *http.Request) {
	indexFile, err := os.Open("./static/index.html")
	defer indexFile.Close()

	if err != nil {
		io.WriteString(w, "error reading index")
		return
	}

	io.Copy(w, indexFile)
}

// StartServer starts a draw web server and listens
// for new clients.
func StartServer() {
	r := mux.NewRouter()

	srv := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:1243",
		WriteTimeout: wsTimeout,
		ReadTimeout:  wsTimeout,
	}
	drawSrv := Server{
		Room:       NewRoom(),
		loginCodes: make(map[string]User),
	}

	r.HandleFunc("/", handleHome)
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))
	r.HandleFunc("/connect", func(w http.ResponseWriter, r *http.Request) {
		drawSrv.connect(drawSrv.Room, w, r)
	})

	log.Printf("draw listening on %s\n", srv.Addr)
	log.Fatal(srv.ListenAndServe())
}
