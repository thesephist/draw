package draw

import (
	"strings"
)

// Room represents a collection of draw clients all
// sending each other messages.
type Room struct {
	Sender chan<- Message
	// map of usernames to emails
	verifiedNames   map[string]string
	clientReceivers map[*Client]chan Message
}

// NewRoom allocates, creates, and returns a new Room
// ready to be used
func NewRoom() *Room {
	return &Room{
		Sender:          make(chan Message),
		verifiedNames:   make(map[string]string),
		clientReceivers: make(map[*Client]chan Message),
	}
}

// Enter creates a new Client for a given user ready
// to be used
func (rm *Room) Enter(u User) *Client {
	receiver := make(chan Message)
	client := Client{
		User:     u,
		Room:     rm,
		receiver: receiver,
	}

	rm.verifiedNames[strings.ToLower(u.Name)] = u.Email
	rm.clientReceivers[&client] = receiver
	go client.StartListening()

	return &client
}

// CanEnter reports whether a user should be allowed in a room.
// A user may not enter a room if another user with a different email
// but a matching username is already inside.
func (rm *Room) CanEnter(u User) bool {
	existingEmail, prs := rm.verifiedNames[strings.ToLower(u.Name)]
	if prs {
		return u.Email == existingEmail
	}

	return true
}

// Broadcast sends a new Message to every client
// in the Room
func (rm *Room) Broadcast(msg Message) {
	for _, receiver := range rm.clientReceivers {
		receiver <- msg
	}
}
