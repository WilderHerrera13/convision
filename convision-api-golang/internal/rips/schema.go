package rips

// This file mirrors the official JSON structure of the Resolución 2275/2023
// FEV-RIPS transaction, verified against primary sources during this phase:
// the Anexo Técnico 1 (suin-juriscol.gov.co), the MinSalud "Lineamientos
// para la generación, validación y envío del RIPS... FEV en salud" (v3.2,
// mayo 2025), the "Manual de usuario convertidor a JSON" (v3.0, abril 2025),
// and the live SISPRO reference-table service
// (web.sispro.gov.co/WebPublico/Consultas/ConsultarDetalleReferenciaBasica.aspx).
//
// JSON field names are copied verbatim (case-sensitive, per the Anexo) —
// only the Go identifiers are in English, per project convention.
//
// Deliberately NOT replicated from Jarvis (see
// docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md, section 07):
//   - no fabricated patient age/name/document when data doesn't fit a format;
//   - no filtering of codDiagnosticoPrincipal to Z00-Z99 (that restriction
//     only applies when finalidadTecnologiaSalud=11, per RVC checks in the
//     lineamientos — see deriveFinalidad/deriveCausa in service.go);
//   - no single hardcoded causaMotivoAtencion/finalidadTecnologiaSalud
//     constant applied blindly regardless of the real encounter.

// Transaction is the root JSON object of a RIPS transmission (the Anexo
// explicitly notes this object has no wrapping key — it IS the document root).
type Transaction struct {
	NumDocumentoIdObligado string    `json:"numDocumentoIdObligado"`
	NumFactura             *string   `json:"numFactura"`
	TipoNota               *string   `json:"tipoNota"`
	NumNota                *string   `json:"numNota"`
	Usuarios               []Usuario `json:"usuarios"`
}

// Usuario is one patient/service-user entry (U01-U11 in the Anexo Técnico 1).
type Usuario struct {
	TipoDocumentoIdentificacion  string    `json:"tipoDocumentoIdentificacion"`
	NumDocumentoIdentificacion   string    `json:"numDocumentoIdentificacion"`
	TipoUsuario                  string    `json:"tipoUsuario"`
	FechaNacimiento              string    `json:"fechaNacimiento"`
	CodSexo                      string    `json:"codSexo"`
	CodPaisResidencia            string    `json:"codPaisResidencia"`
	CodMunicipioResidencia       string    `json:"codMunicipioResidencia"`
	CodZonaTerritorialResidencia string    `json:"codZonaTerritorialResidencia"`
	Incapacidad                  string    `json:"incapacidad"`
	Consecutivo                  int       `json:"consecutivo"`
	CodPaisOrigen                string    `json:"codPaisOrigen"`
	Servicios                    Servicios `json:"servicios"`
}

// Servicios groups every service-type array under a usuario — the Anexo
// fixes these 7 keys regardless of which ones a given transaction uses.
type Servicios struct {
	Consultas       []Consulta `json:"consultas"`
	Procedimientos  []any      `json:"procedimientos"`
	Urgencias       []any      `json:"urgencias"`
	Hospitalizacion []any      `json:"hospitalizacion"`
	RecienNacidos   []any      `json:"recienNacidos"`
	Medicamentos    []any      `json:"medicamentos"`
	OtrosServicios  []any      `json:"otrosServicios"`
}

// Consulta is one outpatient-consultation service (C01-C21 in the Anexo).
// The only service type this phase populates — an optometry visit is
// reported under grupoServicios="01" (Consulta externa), never as a
// procedimiento/urgencia/hospitalización.
type Consulta struct {
	CodPrestador                     string  `json:"codPrestador"`
	FechaInicioAtencion              string  `json:"fechaInicioAtencion"`
	NumAutorizacion                  *string `json:"numAutorizacion"`
	CodConsulta                      string  `json:"codConsulta"`
	ModalidadGrupoServicioTecSal     string  `json:"modalidadGrupoServicioTecSal"`
	GrupoServicios                   string  `json:"grupoServicios"`
	CodServicio                      string  `json:"codServicio"`
	FinalidadTecnologiaSalud         string  `json:"finalidadTecnologiaSalud"`
	CausaMotivoAtencion              string  `json:"causaMotivoAtencion"`
	CodDiagnosticoPrincipal          string  `json:"codDiagnosticoPrincipal"`
	CodDiagnosticoRelacionado1       *string `json:"codDiagnosticoRelacionado1,omitempty"`
	CodDiagnosticoRelacionado2       *string `json:"codDiagnosticoRelacionado2,omitempty"`
	CodDiagnosticoRelacionado3       *string `json:"codDiagnosticoRelacionado3,omitempty"`
	TipoDiagnosticoPrincipal         string  `json:"tipoDiagnosticoPrincipal"`
	TipoDocIdentificacionProfesional string  `json:"tipoDocumentoIdentificacion"`
	NumDocIdentificacionProfesional  string  `json:"numDocumentoIdentificacion"`
	VrServicio                       float64 `json:"vrServicio"`
	ConceptoRecaudo                  string  `json:"conceptoRecaudo"`
	ValorPagoModerador               float64 `json:"valorPagoModerador"`
	NumFEVPagoModerador              *string `json:"numFEVPagoModerador"`
	Consecutivo                      int     `json:"consecutivo"`
}

func emptyArrays() Servicios {
	return Servicios{
		Consultas:       []Consulta{},
		Procedimientos:  []any{},
		Urgencias:       []any{},
		Hospitalizacion: []any{},
		RecienNacidos:   []any{},
		Medicamentos:    []any{},
		OtrosServicios:  []any{},
	}
}
