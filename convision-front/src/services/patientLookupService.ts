import api from '@/lib/axios';

// Define interfaces for all lookup types
export interface LookupItem {
  id: number;
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface Country extends LookupItem {
  code2?: string;
}

export interface Department extends LookupItem {
  country_id: number;
}

export interface City extends LookupItem {
  department_id: number;
}

export interface District extends LookupItem {
  city_id: number;
}

export interface IdentificationType extends LookupItem {}
export interface HealthInsuranceProvider extends LookupItem {}
export interface AffiliationType extends LookupItem {}
export interface CoverageType extends LookupItem {}
export interface EducationLevel extends LookupItem {}

// All lookup data in a single response
export interface AllLookupData {
  identification_types: IdentificationType[];
  health_insurance_providers: HealthInsuranceProvider[];
  affiliation_types: AffiliationType[];
  coverage_types: CoverageType[];
  education_levels: EducationLevel[];
}

class PatientLookupService {
  /**
   * Get all lookup data in a single request
   */
  async getAllLookupData(): Promise<AllLookupData> {
    const response = await api.get('/api/v1/lookup/patient-data');
    return response.data;
  }

  /**
   * Get all identification types
   */
  async getIdentificationTypes(): Promise<IdentificationType[]> {
    const response = await api.get('/api/v1/lookup/identification-types');
    return response.data;
  }

  /**
   * Get all health insurance providers
   */
  async getHealthInsuranceProviders(): Promise<HealthInsuranceProvider[]> {
    const response = await api.get('/api/v1/lookup/health-insurance-providers');
    return response.data;
  }

  /**
   * Get all affiliation types
   */
  async getAffiliationTypes(): Promise<AffiliationType[]> {
    const response = await api.get('/api/v1/lookup/affiliation-types');
    return response.data;
  }

  /**
   * Get all coverage types
   */
  async getCoverageTypes(): Promise<CoverageType[]> {
    const response = await api.get('/api/v1/lookup/coverage-types');
    return response.data;
  }

  /**
   * Get all education levels
   */
  async getEducationLevels(): Promise<EducationLevel[]> {
    const response = await api.get('/api/v1/lookup/education-levels');
    return response.data;
  }

  /**
   * Get all countries
   */
  async getCountries(): Promise<Country[]> {
    const response = await api.get('/api/v1/lookup/countries');
    return response.data;
  }

  /**
   * Get departments by country
   */
  async getDepartments(countryId?: number): Promise<Department[]> {
    const params = countryId ? { country_id: countryId } : {};
    const response = await api.get('/api/v1/lookup/departments', { params });
    return response.data;
  }

  /**
   * Get cities by department
   */
  async getCities(departmentId?: number): Promise<City[]> {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await api.get('/api/v1/lookup/cities', { params });
    return response.data;
  }

  /**
   * Get districts by city
   */
  async getDistricts(cityId?: number): Promise<District[]> {
    const params = cityId ? { city_id: cityId } : {};
    const response = await api.get('/api/v1/lookup/districts', { params });
    return response.data;
  }
}

export const patientLookupService = new PatientLookupService(); 