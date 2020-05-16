package draw

import (
	"sync"
)

// Client represents an abstract client of a chat room
type Client struct {
	User      *User
	Room      *Room
	OnMessage func(Message)

	receiver chan Message
	sync.Mutex
}

// Send sends a new message to the room to which the client
// cl belongs, under the client user's name.
func (cl *Client) Send(kind int, text string) error {
	if cl.Room == nil {
		return Error{"client is not in a room yet"}
	}

	cl.Room.Broadcast(Message{
		Type: kind,
		User: *cl.User,
		Text: text,
	})

	return nil
}

// Leave lets the client leave the room and cleans up.
func (cl *Client) Leave() error {
	// multiple goroutines can double-leavea a client's room.
	// Leave is idempotent, but we protect against data races
	cl.Lock()
	defer cl.Unlock()

	if cl.Room == nil {
		return Error{"client is not in a room yet"}
	}

	delete(cl.Room.clientReceivers, cl)
	close(cl.receiver)
	cl.Room = nil

	return nil
}

// StartListening enters an indefinite loop listening
// for new messages for the client and responds with cl.OnMessage.
func (cl *Client) StartListening() {
	for {
		msg, open := <-cl.receiver
		if !open {
			return
		}

		if cl.OnMessage == nil {
			continue
		}

		cl.OnMessage(msg)
	}
}
