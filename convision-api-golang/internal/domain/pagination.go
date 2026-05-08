package domain

// Pagination holds shared page/per_page query parameters that every Filter
// struct embeds. It is bound from URL query params via c.ShouldBindQuery().
type Pagination struct {
	Page    int `form:"page,default=1"`
	PerPage int `form:"per_page,default=15"`
}

// Offset returns the zero-based row offset for use in GORM .Offset() calls.
func (p *Pagination) Offset() int {
	if p.Page < 1 {
		p.Page = 1
	}
	return (p.Page - 1) * p.PerPage
}

// Clamp enforces safe bounds: Page >= 1, PerPage in [1, 200].
// Call Clamp() at the top of every service List method before passing
// the filter to the repository.
func (p *Pagination) Clamp() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 || p.PerPage > 200 {
		p.PerPage = 15
	}
}
