/**
 * Schema Validation for chrome.storage
 * Runtime type checking without external dependencies
 */

export type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface SchemaField {
    type: SchemaType;
    required?: boolean;
    default?: unknown;
    validate?: (value: unknown) => boolean;
}

export interface Schema {
    [key: string]: SchemaField;
}

export interface ValidationError {
    field: string;
    message: string;
}

export class SchemaValidator {
    private schema: Schema;

    constructor(schema: Schema) {
        this.schema = schema;
    }

    /**
     * Validate data against the schema
     */
    validate(data: Record<string, unknown>): { valid: boolean; errors: ValidationError[] } {
        const errors: ValidationError[] = [];

        for (const [key, field] of Object.entries(this.schema)) {
            const value = data[key];

            // Check required fields
            if (field.required && (value === undefined || value === null)) {
                errors.push({ field: key, message: `${key} is required` });
                continue;
            }

            // Skip optional missing fields
            if (value === undefined || value === null) continue;

            // Type checking
            if (field.type === 'array') {
                if (!Array.isArray(value)) {
                    errors.push({ field: key, message: `${key} must be an array` });
                    continue;
                }
            } else if (typeof value !== field.type) {
                errors.push({ field: key, message: `${key} must be of type ${field.type}, got ${typeof value}` });
                continue;
            }

            // Custom validation
            if (field.validate) {
                try {
                    if (!field.validate(value)) {
                        errors.push({ 
                            field: key, 
                            message: `${key} failed custom validation. Check the validate function for requirements.` 
                        });
                    }
                } catch (e) {
                    const error = e as Error;
                    errors.push({ 
                        field: key, 
                        message: `${key} validation threw an error: ${error.message}. Check the validate function.` 
                    });
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Apply defaults for missing fields
     */
    applyDefaults(data: Record<string, unknown>): Record<string, unknown> {
        const result = { ...data };
        for (const [key, field] of Object.entries(this.schema)) {
            if (result[key] === undefined && field.default !== undefined) {
                result[key] = field.default;
            }
        }
        return result;
    }
}

/**
 * Create a schema definition
 */
export function defineSchema(schema: Schema): SchemaValidator {
    return new SchemaValidator(schema);
}
