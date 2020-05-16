package draw

const (
	// msgHello is used to first connect and request authentication
	msgHello = iota
	// msgText is used for all normal text messages
	msgText
	// msgChangeUser is used to change user name or color
	msgChangeUser
	// msgPresentUsers notifies the client of all present users
	msgPresentUsers
)

// Message represents any atomic communication between a draw client
// and server.
type Message struct {
	Type int    `json:"type"`
	User User   `json:"user"`
	Text string `json:"text"`
}
