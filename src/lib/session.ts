
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { type SessionData, sessionOptions } from './definitions';

export async function getSession() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session;
}
