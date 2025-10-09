
'use server';

import { getSpecialties as getSpecialtiesData } from './data';

// This file is intended for truly global server actions.
// Feature-specific actions should live in their respective route directories.

export async function getSpecialties() {
  return await getSpecialtiesData();
}
