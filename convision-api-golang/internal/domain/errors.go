package domain

// ErrNotFound is returned when a requested resource does not exist.
type ErrNotFound struct {
	Resource string
}

func (e *ErrNotFound) Error() string {
	return e.Resource + " not found"
}

// ErrConflict is returned when a uniqueness constraint is violated.
type ErrConflict struct {
	Resource string
	Field    string
}

func (e *ErrConflict) Error() string {
	return e.Resource + ": " + e.Field + " already exists"
}

// ErrUnauthorized is returned when the caller lacks permission.
type ErrUnauthorized struct {
	Action string
}

func (e *ErrUnauthorized) Error() string {
	return "unauthorized: " + e.Action
}

// ErrValidation is returned when input data fails business-rule validation.
type ErrValidation struct {
	Field   string
	Message string
}

func (e *ErrValidation) Error() string {
	return "validation failed on " + e.Field + ": " + e.Message
}

type ErrLoginNoBranches struct{}

func (e *ErrLoginNoBranches) Error() string {
	return "No tienes ninguna sede asignada. Solicita al administrador que te asigne al menos una sede activa."
}

type ErrOpticaNotFound struct{ Slug string }

func (e *ErrOpticaNotFound) Error() string { return "optica not found: " + e.Slug }

type ErrOpticaInactive struct{ Slug string }

func (e *ErrOpticaInactive) Error() string { return "optica is inactive: " + e.Slug }

type ErrReservedSlug struct{ Slug string }

func (e *ErrReservedSlug) Error() string { return "reserved slug: " + e.Slug }

type ErrSchemaCreationFailed struct {
	Schema string
	Err    error
}

func (e *ErrSchemaCreationFailed) Error() string {
	return "schema creation failed for " + e.Schema + ": " + e.Err.Error()
}

func (e *ErrSchemaCreationFailed) Unwrap() error { return e.Err }
