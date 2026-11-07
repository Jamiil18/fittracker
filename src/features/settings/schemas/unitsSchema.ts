import { z } from 'zod';

// Match the weight_unit and distance_unit enums in the database.
export const weightUnitSchema = z.enum(['kg', 'lb']);
export const distanceUnitSchema = z.enum(['km', 'mi']);
