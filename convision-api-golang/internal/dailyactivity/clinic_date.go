package dailyactivity

import "time"

const clinicLocationName = "America/Bogota"

func clinicLocation() *time.Location {
	loc, err := time.LoadLocation(clinicLocationName)
	if err != nil {
		return time.UTC
	}
	return loc
}

func ClinicTodayYMD() string {
	n := time.Now().In(clinicLocation())
	return n.Format("2006-01-02")
}

func ClinicReportDateForToday() time.Time {
	loc := clinicLocation()
	n := time.Now().In(loc)
	return time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, loc).UTC()
}
