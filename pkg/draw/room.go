package draw

// Room represents a collection of draw clients all
// sending each other messages.
type Room struct {
	Sender          chan<- Message
	clientReceivers map[*Client]chan Message
}

// NewRoom allocates, creates, and returns a new Room
// ready to be used
func NewRoom() *Room {
	return &Room{
		Sender:          make(chan Message),
		clientReceivers: make(map[*Client]chan Message),
	}
}

// Enter creates a new Client for a given user ready
// to be used
func (rm *Room) Enter(u User) *Client {
	receiver := make(chan Message)
	client := Client{
		User:     &u,
		Room:     rm,
		receiver: receiver,
	}

	rm.clientReceivers[&client] = receiver
	go client.StartListening()

	return &client
}

// Broadcast sends a new Message to every client
// in the Room
func (rm *Room) Broadcast(msg Message) {
	for _, receiver := range rm.clientReceivers {
		receiver <- msg
	}
}

// PresentUsers returns all users that are currently present
// (connected to clients) in the room
func (rm *Room) PresentUsers() []User {
	users := []User{}

	for client, _ := range rm.clientReceivers {
		users = append(users, *client.User)
	}

	return users
}
