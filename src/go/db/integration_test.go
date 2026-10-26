package db

import (
	"os"
	"strings"
	"testing"
)

func TestSchemaOnDisposableDatabase(t *testing.T) {
	dsn := os.Getenv("GROUPIE_TEST_DSN")
	if dsn == "" {
		t.Skip("set GROUPIE_TEST_DSN to a dedicated database ending in _test")
	}
	t.Setenv("DB_DSN", dsn)
	cfg, err := databaseConfig()
	if err != nil || !strings.HasSuffix(cfg.DBName, "_test") {
		t.Fatal("integration tests require a dedicated database ending in _test")
	}
	if err := InitDB(); err != nil {
		t.Fatal(err)
	}
	defer DB.Close()
	if err := createTables(); err != nil {
		t.Fatalf("schema must be idempotent: %v", err)
	}
	for _, table := range []string{"users", "favorites", "sessions", "cart", "orders", "order_items", "terms_acceptance"} {
		var count int
		if err := DB.QueryRow("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?", table).Scan(&count); err != nil || count != 1 {
			t.Fatalf("missing table %s: %v", table, err)
		}
	}
	var count int
	if err := DB.QueryRow("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME IN ('first_name','last_name','avatar','is_admin','is_owner')").Scan(&count); err != nil || count != 5 {
		t.Fatalf("user migrations failed: count=%d err=%v", count, err)
	}
}
