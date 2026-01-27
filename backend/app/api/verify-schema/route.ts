import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Check if columns exist
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'analyses'
      ORDER BY ordinal_position;
    `;

    return NextResponse.json({
      success: true,
      columns: result.rows
    });
  } catch (error) {
    console.error('Schema check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
