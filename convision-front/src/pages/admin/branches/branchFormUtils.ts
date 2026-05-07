import type { Branch, BranchPayload } from '@/services/branchService';
import type { BranchFormInput } from './branchSchemas';

export function branchFormToPayload(values: BranchFormInput): BranchPayload {
  return {
    name: values.name,
    address: values.address ?? '',
    city: values.city ?? '',
    phone: values.phone ?? '',
    email: values.email ?? '',
    is_active: values.is_active,
    default_warehouse_id: values.default_warehouse_id ?? null,
  };
}

export function branchToFormValues(branch: Branch): BranchFormInput {
  return {
    name: branch.name,
    address: branch.address ?? '',
    city: branch.city ?? '',
    phone: branch.phone ?? '',
    email: branch.email ?? '',
    is_active: branch.is_active,
    default_warehouse_id: branch.default_warehouse_id ?? null,
  };
}
