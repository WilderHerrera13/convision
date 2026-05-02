package platformmigrations

import "embed"

// FS embeds all platform SQL migration files for use in tenant schema provisioning.
//
//go:embed *.sql
var FS embed.FS
