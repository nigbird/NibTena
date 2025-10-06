'use server';

import { getSpecialties as getSpecialtiesData } from './data';

// This file is intended for truly global server actions.
// Feature-specific actions have been moved to their respective page directories.

export async function getSpecialties() {
  return await getSpecialtiesData();
}
