package server

import (
	"net/http"
	"testing"
)

func TestLocalServerDefaultsAndTLSConfiguration(t *testing.T) {
	t.Setenv("HOST", "")
	t.Setenv("PORT", "")
	t.Setenv("TLS_CERT_FILE", "")
	t.Setenv("TLS_KEY_FILE", "")
	s, cert, key, err := newServer(http.NewServeMux())
	if err != nil || s.Addr != "127.0.0.1:8080" || cert != "" || key != "" {
		t.Fatalf("unexpected local settings: %v %q", err, s.Addr)
	}
	t.Setenv("TLS_CERT_FILE", "certs/localhost.crt")
	if _, _, _, err := newServer(nil); err == nil {
		t.Fatal("incomplete TLS configuration must fail")
	}
	t.Setenv("TLS_KEY_FILE", "certs/localhost.key")
	t.Setenv("PORT", "8443")
	s, cert, key, err = newServer(nil)
	if err != nil || s.Addr != "127.0.0.1:8443" || cert == "" || key == "" {
		t.Fatal("explicit TLS settings were not preserved")
	}
}
