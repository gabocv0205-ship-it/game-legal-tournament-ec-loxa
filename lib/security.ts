import { NextResponse } from 'next/server';

export function rejectCrossOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  const expectedOrigin = new URL(request.url).origin;

  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json({ error: 'Origen de solicitud inválido' }, { status: 403 });
  }

  return null;
}
