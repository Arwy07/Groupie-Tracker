package utils

import "testing"

func TestParseYear(t *testing.T) {
	if ParseYear("05-12-1999") != 1999 {
		t.Fatal("expected 1999")
	}
	if ParseYear("invalid") != 0 {
		t.Fatal("invalid input should return 0")
	}
}

