package bulkimport

import (
	"errors"
	"strings"
	"unicode"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// staffUserRoles maps Spanish role labels from the Excel file to system roles.
var staffUserRoles = map[string]domain.Role{
	"asesor":    domain.RoleReceptionist,
	"optometra": domain.RoleSpecialist,
	"optómetra": domain.RoleSpecialist,
}

var staffUserImportColumns = []string{
	"Nombre", "Documento", "Rol", "Sede",
}

type staffUserImporter struct {
	userRepo   domain.UserRepository
	branchRepo domain.BranchRepository
	logger     *zap.Logger
}

func newStaffUserImporter(userRepo domain.UserRepository, branchRepo domain.BranchRepository, logger *zap.Logger) Importer {
	return &staffUserImporter{userRepo: userRepo, branchRepo: branchRepo, logger: logger}
}

func (i *staffUserImporter) Columns() []string { return staffUserImportColumns }

func (i *staffUserImporter) ProcessRow(db *gorm.DB, rowNum int, data map[string]string) RecordResult {
	rec := RecordResult{Row: rowNum, Data: data}

	rawID := strings.TrimSpace(data["documento"])
	if rawID == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Documento vacío"
		return rec
	}
	identification := normalizeIdentification(rawID)

	fullName := strings.TrimSpace(data["nombre"])
	if fullName == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Nombre vacío"
		return rec
	}

	rolLabel := strings.ToLower(strings.TrimSpace(data["rol"]))
	role, ok := staffUserRoles[rolLabel]
	if !ok {
		rec.Status = RecordStatusError
		rec.Reason = "Rol desconocido: " + data["rol"] + " (valores aceptados: Asesor, Optometra)"
		return rec
	}

	branchName := strings.TrimSpace(data["sede"])
	if branchName == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Sede vacío"
		return rec
	}

	// Duplicate check by identification (used as login key).
	if _, err := i.userRepo.GetByIdentification(db, identification); err == nil {
		rec.Status = RecordStatusSkipped
		rec.Reason = "usuario ya existe (documento duplicado)"
		return rec
	}

	// Also check by identification used as email login key.
	if _, err := i.userRepo.GetByEmail(db, identification); err == nil {
		rec.Status = RecordStatusSkipped
		rec.Reason = "usuario ya existe (documento duplicado)"
		return rec
	}

	firstName, lastName := splitStaffName(toTitleCase(fullName))

	branch, err := i.branchRepo.FindByName(db, branchName)
	if err != nil {
		var notFound *domain.ErrBranchNotFound
		if !errors.As(err, &notFound) {
			i.logger.Warn("bulk import: branch lookup error",
				zap.Int("row", rowNum),
				zap.String("branch", branchName),
				zap.Error(err),
			)
			rec.Status = RecordStatusError
			rec.Reason = "error al buscar sede: " + err.Error()
			return rec
		}
		branch = &domain.Branch{Name: branchName, IsActive: true}
		if err := i.branchRepo.Create(db, branch); err != nil {
			i.logger.Warn("bulk import: failed to create branch",
				zap.Int("row", rowNum),
				zap.String("branch", branchName),
				zap.Error(err),
			)
			rec.Status = RecordStatusError
			rec.Reason = "error al crear sede: " + err.Error()
			return rec
		}
	}

	u := &domain.User{
		Name:           firstName,
		LastName:       lastName,
		Email:          identification,
		Identification: identification,
		Role:           role,
		Active:         true,
		Password:       defaultTempPassword(),
	}

	if err := i.userRepo.Create(db, u); err != nil {
		i.logger.Warn("bulk import: failed to create staff user",
			zap.Int("row", rowNum),
			zap.String("identification", identification),
			zap.Error(err),
		)
		rec.Status = RecordStatusError
		rec.Reason = "error al crear usuario: " + err.Error()
		return rec
	}

	ub := domain.UserBranch{UserID: u.ID, BranchID: branch.ID, IsPrimary: true}
	if err := db.Create(&ub).Error; err != nil {
		i.logger.Warn("bulk import: failed to assign branch to user",
			zap.Int("row", rowNum),
			zap.Uint("user_id", u.ID),
			zap.Uint("branch_id", branch.ID),
			zap.Error(err),
		)
	}

	rec.Status = RecordStatusCreated
	return rec
}

// normalizeIdentification strips dots, commas, and spaces from a document number.
func normalizeIdentification(s string) string {
	var b strings.Builder
	for _, r := range s {
		if unicode.IsDigit(r) || unicode.IsLetter(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// splitStaffName splits a full name into first name + last name halves.
// For 4 words (typical Colombian name): first 2 words = name, last 2 = last name.
func splitStaffName(full string) (string, string) {
	parts := strings.Fields(full)
	switch len(parts) {
	case 0:
		return full, ""
	case 1:
		return parts[0], ""
	case 2:
		return parts[0], parts[1]
	case 3:
		return parts[0], strings.Join(parts[1:], " ")
	default:
		mid := len(parts) / 2
		return strings.Join(parts[:mid], " "), strings.Join(parts[mid:], " ")
	}
}
