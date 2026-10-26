package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestExternalPaymentsRequireSandboxAndCredentials(t *testing.T) {
	next := sandboxPayment(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) })
	for _, tc := range []struct {
		mode, id, secret string
		want             int
	}{
		{"production", "test", "test", http.StatusForbidden},
		{"sandbox", "", "", http.StatusServiceUnavailable},
		{"sandbox", "test", "test", http.StatusNoContent},
	} {
		t.Setenv("PAYPAL_MODE", tc.mode)
		t.Setenv("PAYPAL_CLIENT_ID", tc.id)
		t.Setenv("PAYPAL_CLIENT_SECRET", tc.secret)
		w := httptest.NewRecorder()
		next(w, httptest.NewRequest(http.MethodPost, "/api/payment/create", nil))
		if w.Code != tc.want {
			t.Fatalf("mode %q: got %d want %d", tc.mode, w.Code, tc.want)
		}
	}
}
