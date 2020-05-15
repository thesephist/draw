package draw

// User represents a user with the intent to join
// a draw chat session
type User struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}
