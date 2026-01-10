/**
 * Value Object para números de telefone.
 * Encapsula lógica de normalização e validação.
 */
export class Phone {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string | null | undefined): Phone | null {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8) return null;
    return new Phone(digits);
  }

  static fromNormalized(digits: string): Phone {
    return new Phone(digits);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Phone | null): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  format(): string {
    // Formato brasileiro: +55 (11) 99999-9999
    if (this.value.length === 13 && this.value.startsWith('55')) {
      const ddd = this.value.slice(2, 4);
      const part1 = this.value.slice(4, 9);
      const part2 = this.value.slice(9);
      return `+55 (${ddd}) ${part1}-${part2}`;
    }
    // Formato com DDD: (11) 99999-9999
    if (this.value.length === 11) {
      const ddd = this.value.slice(0, 2);
      const part1 = this.value.slice(2, 7);
      const part2 = this.value.slice(7);
      return `(${ddd}) ${part1}-${part2}`;
    }
    return this.value;
  }

  toWhatsAppFormat(): string {
    // Remove o 9 extra se necessário para formato internacional
    return this.value;
  }
}
