package draw

const (
	// msgHello is used to first connect and request authentication
	msgHello = iota
	// msgText is used for all normal text messages
	msgText

	// msgAuth represents an attempt to authenticate with a token
	msgAuth
	// msgAuthAck is sent by the server to approve authentication attempt
	msgAuthAck
	// msgAuthRst is sent by the server to reject authentication attemp
	msgAuthRst

	// msgMayNotEnter is sent by the server to reject entry attempt, usually
	// means the username is taken
	msgMayNotEnter

	// In the future, we can support things like presence
	// by using additional codes like MsgTypingStart/Stop
)

// Message represents any atomic communication between a draw client
// and server.
type Message struct {
	Type int    `json:"type"`
	User User   `json:"user"`
	Text string `json:"text"`
}
