// Package migrations exposes the embedded SQL migration files.
// Placing the embed directives here keeps the path relative and valid.
package migrations

import "embed"

//go:embed platform/*.sql
var Platform embed.FS

//go:embed tenant/*.sql
var Tenant embed.FS
