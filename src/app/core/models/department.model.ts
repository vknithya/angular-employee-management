export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  location: string;
  headId: string | null;
  headName?: string;
  employeeCount?: number;
}

export type DepartmentPayload = Pick<
  Department,
  'name' | 'code' | 'description' | 'location' | 'headId'
>;
