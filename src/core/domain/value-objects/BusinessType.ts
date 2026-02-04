/**
 * Business Type Value Object
 * Represents the type of business for a workspace
 */
export type BusinessTypeValue = 
  | 'wholesale_clothing'  // Atacado de Roupas
  | 'retail_clothing'     // Varejo de Roupas
  | 'clinic'              // Clínica
  | 'other';              // Outros

export interface BusinessTypeInfo {
  value: BusinessTypeValue;
  label: string;
  description: string;
  icon: string;
}

export const BUSINESS_TYPES: Record<BusinessTypeValue, BusinessTypeInfo> = {
  wholesale_clothing: {
    value: 'wholesale_clothing',
    label: 'Atacado de Roupas',
    description: 'Vendas por atacado para lojistas e revendedores',
    icon: 'Package',
  },
  retail_clothing: {
    value: 'retail_clothing',
    label: 'Varejo de Roupas',
    description: 'Vendas diretas ao consumidor final',
    icon: 'ShoppingBag',
  },
  clinic: {
    value: 'clinic',
    label: 'Clínica',
    description: 'Consultórios e clínicas de saúde',
    icon: 'Stethoscope',
  },
  other: {
    value: 'other',
    label: 'Outros',
    description: 'Outros tipos de negócio',
    icon: 'Building2',
  },
};

export class BusinessType {
  private readonly value: BusinessTypeValue;

  private constructor(value: BusinessTypeValue) {
    this.value = value;
  }

  static create(value: BusinessTypeValue): BusinessType {
    if (!BUSINESS_TYPES[value]) {
      throw new Error(`Invalid business type: ${value}`);
    }
    return new BusinessType(value);
  }

  static fromString(value: string | null | undefined): BusinessType | null {
    if (!value) return null;
    if (value in BUSINESS_TYPES) {
      return new BusinessType(value as BusinessTypeValue);
    }
    return null;
  }

  getValue(): BusinessTypeValue {
    return this.value;
  }

  getInfo(): BusinessTypeInfo {
    return BUSINESS_TYPES[this.value];
  }

  getLabel(): string {
    return BUSINESS_TYPES[this.value].label;
  }

  equals(other: BusinessType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
