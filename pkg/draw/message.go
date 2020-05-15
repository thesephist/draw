package draw

const (
	// msgHello is used to first connect and request authentication
	msgHello = iota
	// msgText is used for all normal text messages
	msgText
	// msgSetName indicates request to change Name of the user
	msgSetName
	// msgSetColor indicates request to change Color of the user
	msgSetColor
)

// Message represents any atomic communication between a draw client
// and server.
type Message struct {
	Type int    `json:"type"`
	User User   `json:"user"`
	Text string `json:"text"`
}
