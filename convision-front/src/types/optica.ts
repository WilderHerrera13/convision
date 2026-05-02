export interface Optica {
  id: number;
  slug: string;
  name: string;
  plan: 'standard' | 'premium' | 'enterprise';
  is_active: boolean;
  schema_name: string;
  created_at: string;
}

export interface CreateOpticaInput {
  name: string;
  slug: string;
  plan: string;
  admin: {
    name: string;
    email: string;
    password: string;
  };
}

export interface UpdateOpticaInput {
  name?: string;
  plan?: string;
  is_active?: boolean;
}

export interface OpticaFeature {
  feature_key: string;
  is_enabled: boolean;
}

export interface FeatureToggle {
  feature_key: string;
  is_enabled: boolean;
}
