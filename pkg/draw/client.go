package draw

import (
	"encoding/json"
)

// Error represents any error originating
// from unexpected states in the draw server.
type Error struct {
	reason string
}

func (err Error) Error() string {
	return err.reason
}

// User represents a user with the intent to join
// a draw chat session
type User struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

// Client represents an abstract client of a chat room
type Client struct {
	User      *User
	Room      *Room
	OnMessage func(Message)

	receiver chan Message
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

// BroadcastUserList pings the room the send a list of all
// active users to all clients
func (cl *Client) BroadcastUserList() {
	presentUsers := cl.Room.PresentUsers()
	serialized, err := json.Marshal(presentUsers)
	if err != nil {
		return
	}

	cl.Send(msgPresentUsers, string(serialized))
}

// Leave lets the client leave the room and cleans up.
func (cl *Client) Leave() error {
	if cl.Room == nil {
		return Error{"client is not in a room yet"}
	}

	// remember room before exiting, so we can notify
	// remaining users of leaving
	rm := cl.Room

	delete(cl.Room.clientReceivers, cl)
	close(cl.receiver)
	cl.Room = nil

	// like BroadcastUserList()
	presentUsers := rm.PresentUsers()
	serialized, err := json.Marshal(presentUsers)
	if err != nil {
		return nil
	}
	rm.Broadcast(Message{
		Type: msgPresentUsers,
		User: *cl.User,
		Text: string(serialized),
	})

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
