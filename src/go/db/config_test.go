package db

import "testing"

func TestDatabaseConfigurationRequiresExplicitDSN(t *testing.T) {
	t.Setenv("DB_DSN", "")
	if _, err := databaseConfig(); err == nil {
		t.Fatal("missing credentials must not fall back to root")
	}
	t.Setenv("DB_DSN", "demo:example@tcp(127.0.0.1:3306)/?parseTime=true")
	if _, err := databaseConfig(); err == nil {
		t.Fatal("database name is required")
	}
	t.Setenv("DB_DSN", "demo:example@tcp(127.0.0.1:3306)/demo?parseTime=false")
	c, err := databaseConfig()
	if err != nil || !c.ParseTime || c.DBName != "demo" {
		t.Fatalf("invalid parsed configuration: %v", err)
	}
}
